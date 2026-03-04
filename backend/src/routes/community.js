// ============================================================
// Community Routes — Channels, Posts, Reactions
// FreeBox users: only #freebox channel
// Premium users: all channels
// ============================================================

const { z } = require('zod');
const prisma = require('../utils/prisma');
const { authenticate, optionalAuth } = require('../middleware/auth');

const postSchema = z.object({
  channelId: z.string().min(1),
  content: z.string().min(1, 'El mensaje no puede estar vacio').max(5000),
  imageUrl: z.string().url().optional().nullable(),
  parentId: z.string().optional().nullable()
});

const reactionSchema = z.object({
  postId: z.string().min(1),
  type: z.enum(['fire', 'heart', 'brain', 'rocket', 'clap'])
});

// Escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function communityRoutes(fastify) {

  // ── GET /channels — List channels (filtered by access) ──
  fastify.get('/channels', { preHandler: authenticate }, async (request, reply) => {
    const hasSubscription = await checkSubscription(request.user.id);
    const isAdmin = request.user.role === 'ADMIN';

    let where = {};
    if (!hasSubscription && !isAdmin) {
      // Free users only see FREEBOX channels
      where = { type: 'FREEBOX' };
    }

    const channels = await prisma.channel.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { posts: true } }
      }
    });

    reply.send({ success: true, data: channels });
  });

  // ── GET /channels/:slug/posts — Posts in a channel ──
  fastify.get('/channels/:slug/posts', { preHandler: authenticate }, async (request, reply) => {
    const { slug } = request.params;
    const { page = 1, limit = 20 } = request.query || {};

    const channel = await prisma.channel.findUnique({ where: { slug } });
    if (!channel) {
      return reply.status(404).send({ success: false, error: 'Canal no encontrado' });
    }

    // Access check
    const hasSubscription = await checkSubscription(request.user.id);
    const isAdmin = request.user.role === 'ADMIN';
    if (channel.type !== 'FREEBOX' && !hasSubscription && !isAdmin) {
      return reply.status(403).send({ success: false, error: 'Se requiere suscripcion para acceder a este canal', code: 'NO_SUBSCRIPTION' });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: { channelId: channel.id, parentId: null }, // Top-level posts only
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: parseInt(limit),
        include: {
          user: { select: { id: true, name: true, avatar: true, level: true, role: true } },
          reactions: {
            select: { type: true, userId: true }
          },
          _count: { select: { replies: true } }
        }
      }),
      prisma.post.count({ where: { channelId: channel.id, parentId: null } })
    ]);

    // Aggregate reactions
    const postsWithReactions = posts.map(post => {
      const reactionCounts = {};
      let userReactions = [];
      post.reactions.forEach(r => {
        reactionCounts[r.type] = (reactionCounts[r.type] || 0) + 1;
        if (r.userId === request.user.id) userReactions.push(r.type);
      });
      const { reactions, ...postData } = post;
      return { ...postData, reactionCounts, userReactions, replyCount: post._count.replies };
    });

    reply.send({
      success: true,
      data: { posts: postsWithReactions, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) }
    });
  });

  // ── GET /posts/:id/replies — Threaded replies ──
  fastify.get('/posts/:id/replies', { preHandler: authenticate }, async (request, reply) => {
    const replies = await prisma.post.findMany({
      where: { parentId: request.params.id },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, avatar: true, level: true, role: true } },
        reactions: { select: { type: true, userId: true } }
      }
    });

    reply.send({ success: true, data: replies });
  });

  // ── POST /posts — Create post ──
  fastify.post('/posts', {
    preHandler: authenticate,
    config: { rateLimit: { max: 2, timeWindow: '1 minute' } } // Anti-spam
  }, async (request, reply) => {
    const data = postSchema.parse(request.body);

    // Verify channel access
    const channel = await prisma.channel.findUnique({ where: { id: data.channelId } });
    if (!channel) {
      return reply.status(404).send({ success: false, error: 'Canal no encontrado' });
    }

    const hasSubscription = await checkSubscription(request.user.id);
    const isAdmin = request.user.role === 'ADMIN';

    if (channel.type !== 'FREEBOX' && !hasSubscription && !isAdmin) {
      return reply.status(403).send({ success: false, error: 'Se requiere suscripcion para publicar en este canal' });
    }

    // Sanitize content
    const sanitizedContent = escapeHtml(data.content);

    const post = await prisma.post.create({
      data: {
        channelId: data.channelId,
        userId: request.user.id,
        content: sanitizedContent,
        imageUrl: data.imageUrl || null,
        parentId: data.parentId || null
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, level: true, role: true } }
      }
    });

    // Grant XP for posting (max 5 posts/day)
    if (hasSubscription || isAdmin) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayPosts = await prisma.xpLog.count({
        where: { userId: request.user.id, reason: 'post_create', createdAt: { gte: todayStart } }
      });

      if (todayPosts < 5) {
        await prisma.xpLog.create({
          data: { userId: request.user.id, amount: 10, reason: 'post_create', metadata: { postId: post.id } }
        });
        await prisma.user.update({
          where: { id: request.user.id },
          data: { xp: { increment: 10 } }
        });
      }
    }

    reply.status(201).send({ success: true, data: post });
  });

  // ── POST /reactions — Toggle reaction ──
  fastify.post('/reactions', { preHandler: authenticate }, async (request, reply) => {
    const data = reactionSchema.parse(request.body);

    // Check if reaction exists
    const existing = await prisma.reaction.findUnique({
      where: {
        postId_userId_type: { postId: data.postId, userId: request.user.id, type: data.type }
      }
    });

    if (existing) {
      // Remove reaction
      await prisma.reaction.delete({ where: { id: existing.id } });
      reply.send({ success: true, data: { action: 'removed', type: data.type } });
    } else {
      // Add reaction
      await prisma.reaction.create({
        data: { postId: data.postId, userId: request.user.id, type: data.type }
      });

      // Grant XP to post author (max 20/day)
      const post = await prisma.post.findUnique({ where: { id: data.postId }, select: { userId: true } });
      if (post && post.userId !== request.user.id) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayReactionXp = await prisma.xpLog.count({
          where: { userId: post.userId, reason: 'reaction_received', createdAt: { gte: todayStart } }
        });
        if (todayReactionXp < 20) {
          await prisma.xpLog.create({
            data: { userId: post.userId, amount: 5, reason: 'reaction_received', metadata: { postId: data.postId } }
          });
          await prisma.user.update({
            where: { id: post.userId },
            data: { xp: { increment: 5 } }
          });
        }
      }

      reply.send({ success: true, data: { action: 'added', type: data.type } });
    }
  });

  // ── DELETE /posts/:id — Delete post (admin or author) ──
  fastify.delete('/posts/:id', { preHandler: authenticate }, async (request, reply) => {
    const post = await prisma.post.findUnique({ where: { id: request.params.id } });
    if (!post) {
      return reply.status(404).send({ success: false, error: 'Post no encontrado' });
    }

    if (post.userId !== request.user.id && request.user.role !== 'ADMIN') {
      return reply.status(403).send({ success: false, error: 'No tienes permiso para eliminar este post' });
    }

    // Delete post and all replies
    await prisma.post.deleteMany({ where: { parentId: post.id } });
    await prisma.post.delete({ where: { id: post.id } });

    reply.send({ success: true, message: 'Post eliminado' });
  });
}

// Helper: check if user has active subscription
async function checkSubscription(userId) {
  const sub = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
      expiresAt: { gt: new Date() }
    }
  });
  return !!sub;
}

module.exports = communityRoutes;
