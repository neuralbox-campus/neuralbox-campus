// ============================================================
// Admin Routes — Content CRUD, User Mgmt, Dashboard Stats
// All routes require ADMIN role
// ============================================================

const { z } = require('zod');
const prisma = require('../utils/prisma');
const { requireAdmin } = require('../middleware/auth');

// ─── Validation Schemas ─────────────────────────────────────

const categorySchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  order: z.number().int().min(0).optional()
});

const courseSchema = z.object({
  categoryId: z.string().min(1),
  title: z.string().min(2).max(200),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  thumbnail: z.string().url().optional().nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
  order: z.number().int().min(0).optional()
});

const moduleSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(2).max(200),
  description: z.string().max(1000).optional(),
  order: z.number().int().min(0).optional()
});

const lessonSchema = z.object({
  moduleId: z.string().min(1),
  title: z.string().min(2).max(200),
  type: z.enum(['VIDEO', 'TEXT', 'QUIZ', 'RESOURCE']).optional(),
  videoUrl: z.string().url().optional().nullable(),
  content: z.string().max(50000).optional().nullable(),
  duration: z.number().int().min(0).optional().nullable(),
  xp: z.number().int().min(0).max(1000).optional(),
  order: z.number().int().min(0).optional(),
  resources: z.any().optional()
});

const channelSchema = z.object({
  name: z.string().min(2).max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(500).optional(),
  type: z.enum(['PUBLIC', 'FREEBOX', 'ADMIN']).optional(),
  icon: z.string().max(50).optional(),
  order: z.number().int().min(0).optional()
});

const leadSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().max(200).optional(),
  source: z.string().max(100).optional(),
  status: z.string().max(50).optional(),
  notes: z.string().max(2000).optional()
});

const codeGenerateSchema = z.object({
  type: z.enum(['preventa', 'descuento']).default('preventa'),
  email: z.string().email().optional().nullable(),
  discount: z.number().int().min(0).max(100).optional(),
  maxUses: z.number().int().min(1).max(10000).optional()
});

async function adminRoutes(fastify) {

  // All admin routes require ADMIN role
  fastify.addHook('preHandler', requireAdmin);

  // ════════════════════════════════════════════════════════════
  // DASHBOARD STATS
  // ════════════════════════════════════════════════════════════

  fastify.get('/stats', async (request, reply) => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers, newUsersThisMonth,
      activeSubscriptions, totalRevenue,
      revenueThisMonth, revenueLastMonth,
      totalLessons, totalCourses,
      totalLeads, paidLeads, completedLessonsCount
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { createdAt: { gte: thisMonth } } }),
      prisma.subscription.count({ where: { status: 'ACTIVE', expiresAt: { gt: now } } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED', paidAt: { gte: thisMonth } }, _sum: { amount: true } }),
      prisma.payment.aggregate({ where: { status: 'COMPLETED', paidAt: { gte: lastMonth, lt: thisMonth } }, _sum: { amount: true } }),
      prisma.lesson.count(),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'pagado' } }),
      prisma.progress.count({ where: { completed: true } })
    ]);

    const mrr = revenueThisMonth._sum.amount || 0;
    const lastMrr = revenueLastMonth._sum.amount || 0;
    const mrrGrowth = lastMrr > 0 ? Math.round(((mrr - lastMrr) / lastMrr) * 100) : 0;

    reply.send({
      success: true,
      data: {
        totalUsers,
        newUsersThisMonth,
        activeSubscriptions,
        activeSinapsis: activeSubscriptions,
        totalRevenue: (totalRevenue._sum.amount || 0) / 100,
        mrr: mrr / 100,
        mrrGrowth,
        totalLessons,
        totalCourses,
        totalLeads,
        paidLeads,
        completedLessons: completedLessonsCount
      }
    });
  });

  // Recent payments
  fastify.get('/payments', async (request, reply) => {
    const { page = 1, limit = 20 } = request.query || {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(limit),
        include: {
          user: { select: { id: true, name: true, email: true } },
          subscription: { select: { plan: true } }
        }
      }),
      prisma.payment.count()
    ]);

    reply.send({ success: true, data: { payments, total, page: parseInt(page) } });
  });

  // ════════════════════════════════════════════════════════════
  // CATEGORIES CRUD
  // ════════════════════════════════════════════════════════════

  fastify.get('/categories', async (req, reply) => {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { courses: true } } }
    });
    reply.send({ success: true, data: categories });
  });

  fastify.post('/categories', async (req, reply) => {
    const data = categorySchema.parse(req.body);
    const category = await prisma.category.create({ data });
    reply.status(201).send({ success: true, data: category });
  });

  fastify.put('/categories/:id', async (req, reply) => {
    const data = categorySchema.partial().parse(req.body);
    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    reply.send({ success: true, data: category });
  });

  fastify.delete('/categories/:id', async (req, reply) => {
    await prisma.category.delete({ where: { id: req.params.id } });
    reply.send({ success: true, message: 'Categoria eliminada' });
  });

  // ════════════════════════════════════════════════════════════
  // COURSES CRUD
  // ════════════════════════════════════════════════════════════

  fastify.get('/courses', async (req, reply) => {
    const courses = await prisma.course.findMany({
      orderBy: { order: 'asc' },
      include: {
        category: { select: { id: true, name: true } },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: { id: true, title: true, type: true, duration: true, xp: true, order: true }
            }
          }
        },
        _count: { select: { modules: true, enrollments: true } }
      }
    });
    reply.send({ success: true, data: courses });
  });

  fastify.post('/courses', async (req, reply) => {
    const data = courseSchema.parse(req.body);
    const course = await prisma.course.create({ data });
    reply.status(201).send({ success: true, data: course });
  });

  fastify.put('/courses/:id', async (req, reply) => {
    const data = courseSchema.partial().parse(req.body);
    const course = await prisma.course.update({ where: { id: req.params.id }, data });
    reply.send({ success: true, data: course });
  });

  fastify.delete('/courses/:id', async (req, reply) => {
    await prisma.course.delete({ where: { id: req.params.id } });
    reply.send({ success: true, message: 'Curso eliminado' });
  });

  // ════════════════════════════════════════════════════════════
  // MODULES CRUD
  // ════════════════════════════════════════════════════════════

  fastify.get('/courses/:courseId/modules', async (req, reply) => {
    const modules = await prisma.module.findMany({
      where: { courseId: req.params.courseId },
      orderBy: { order: 'asc' },
      include: { _count: { select: { lessons: true } } }
    });
    reply.send({ success: true, data: modules });
  });

  fastify.post('/modules', async (req, reply) => {
    const data = moduleSchema.parse(req.body);
    const module = await prisma.module.create({ data });
    reply.status(201).send({ success: true, data: module });
  });

  fastify.put('/modules/:id', async (req, reply) => {
    const data = moduleSchema.partial().parse(req.body);
    const module = await prisma.module.update({ where: { id: req.params.id }, data });
    reply.send({ success: true, data: module });
  });

  fastify.delete('/modules/:id', async (req, reply) => {
    await prisma.module.delete({ where: { id: req.params.id } });
    reply.send({ success: true, message: 'Modulo eliminado' });
  });

  // ════════════════════════════════════════════════════════════
  // LESSONS CRUD
  // ════════════════════════════════════════════════════════════

  fastify.get('/modules/:moduleId/lessons', async (req, reply) => {
    const lessons = await prisma.lesson.findMany({
      where: { moduleId: req.params.moduleId },
      orderBy: { order: 'asc' }
    });
    reply.send({ success: true, data: lessons });
  });

  fastify.post('/lessons', async (req, reply) => {
    const data = lessonSchema.parse(req.body);
    const lesson = await prisma.lesson.create({ data });
    reply.status(201).send({ success: true, data: lesson });
  });

  fastify.put('/lessons/:id', async (req, reply) => {
    const data = lessonSchema.partial().parse(req.body);
    const lesson = await prisma.lesson.update({ where: { id: req.params.id }, data });
    reply.send({ success: true, data: lesson });
  });

  fastify.delete('/lessons/:id', async (req, reply) => {
    await prisma.lesson.delete({ where: { id: req.params.id } });
    reply.send({ success: true, message: 'Leccion eliminada' });
  });

  // ════════════════════════════════════════════════════════════
  // CHANNELS CRUD
  // ════════════════════════════════════════════════════════════

  fastify.get('/channels', async (req, reply) => {
    const channels = await prisma.channel.findMany({
      orderBy: { order: 'asc' },
      include: { _count: { select: { posts: true } } }
    });
    reply.send({ success: true, data: channels });
  });

  fastify.post('/channels', async (req, reply) => {
    const data = channelSchema.parse(req.body);
    const channel = await prisma.channel.create({ data });
    reply.status(201).send({ success: true, data: channel });
  });

  fastify.put('/channels/:id', async (req, reply) => {
    const data = channelSchema.partial().parse(req.body);
    const channel = await prisma.channel.update({ where: { id: req.params.id }, data });
    reply.send({ success: true, data: channel });
  });

  fastify.delete('/channels/:id', async (req, reply) => {
    await prisma.channel.delete({ where: { id: req.params.id } });
    reply.send({ success: true, message: 'Canal eliminado' });
  });

  // ════════════════════════════════════════════════════════════
  // USER MANAGEMENT
  // ════════════════════════════════════════════════════════════

  fastify.get('/users', async (req, reply) => {
    const { page = 1, limit = 20, search = '' } = req.query || {};
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search ? {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip, take: parseInt(limit),
        select: {
          id: true, email: true, name: true, role: true, xp: true, level: true,
          streak: true, isActive: true, createdAt: true, lastActiveAt: true,
          subscriptions: {
            where: { status: { in: ['ACTIVE', 'GRACE_PERIOD'] } },
            select: { plan: true, status: true, expiresAt: true },
            take: 1
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    reply.send({ success: true, data: { users, total, page: parseInt(page) } });
  });

  // Toggle user active status
  fastify.patch('/users/:id/toggle-active', async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) return reply.status(404).send({ success: false, error: 'Usuario no encontrado' });

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: !user.isActive }
    });

    reply.send({ success: true, data: { isActive: updated.isActive } });
  });

  // ════════════════════════════════════════════════════════════
  // LEADS CRUD
  // ════════════════════════════════════════════════════════════

  fastify.get('/leads', async (req, reply) => {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' }
    });
    reply.send({ success: true, data: leads });
  });

  fastify.post('/leads', async (req, reply) => {
    const data = leadSchema.parse(req.body);
    const lead = await prisma.lead.create({ data });
    reply.status(201).send({ success: true, data: lead });
  });

  fastify.put('/leads/:id', async (req, reply) => {
    const data = leadSchema.partial().parse(req.body);
    const lead = await prisma.lead.update({ where: { id: req.params.id }, data });
    reply.send({ success: true, data: lead });
  });

  fastify.delete('/leads/:id', async (req, reply) => {
    await prisma.lead.delete({ where: { id: req.params.id } });
    reply.send({ success: true, message: 'Lead eliminado' });
  });

  // ════════════════════════════════════════════════════════════
  // CODES CRUD
  // ════════════════════════════════════════════════════════════

  fastify.get('/codes', async (req, reply) => {
    const codes = await prisma.code.findMany({
      orderBy: { createdAt: 'desc' }
    });
    reply.send({ success: true, data: codes });
  });

  fastify.post('/codes', async (req, reply) => {
    const data = codeGenerateSchema.parse(req.body);
    const crypto = require('crypto');
    const code = await prisma.code.create({
      data: {
        code: `NB-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        type: data.type,
        email: data.email || null,
        assignedTo: data.email || null,
        discount: data.discount || 0,
        maxUses: data.maxUses || 1
      }
    });
    reply.status(201).send({ success: true, data: code });
  });

  fastify.delete('/codes/:id', async (req, reply) => {
    await prisma.code.delete({ where: { id: req.params.id } });
    reply.send({ success: true, message: 'Codigo eliminado' });
  });
}

module.exports = adminRoutes;
