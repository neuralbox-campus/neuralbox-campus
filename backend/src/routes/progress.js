// ============================================================
// Progress Routes — Complete lessons, earn XP
// ============================================================

const prisma = require('../utils/prisma');
const { requireSubscription } = require('../middleware/auth');

// ─── XP Configuration ───────────────────────────────────────
const XP_REWARDS = {
  LESSON_COMPLETE: 50,    // Overridden by lesson.xp
  MODULE_COMPLETE: 200,
  COURSE_COMPLETE: 500,
  QUIZ_PERFECT: 100,
  POST_CREATE: 10,
  REACTION_RECEIVED: 5,
  STREAK_DAILY: 25,
  STREAK_7_DAYS: 100,
  STREAK_30_DAYS: 500
};

async function grantXp(userId, amount, reason, metadata = null) {
  await prisma.$transaction([
    prisma.xpLog.create({
      data: { userId, amount, reason, metadata }
    }),
    prisma.user.update({
      where: { id: userId },
      data: {
        xp: { increment: amount },
        level: { set: prisma.raw(`GREATEST(1, FLOOR(("xp" + ${amount}) / 1000) + 1)`) }
      }
    })
  ]);

  // Recalculate level properly
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { xp: true } });
  const newLevel = Math.max(1, Math.floor(user.xp / 1000) + 1);
  await prisma.user.update({ where: { id: userId }, data: { level: newLevel } });

  return { xpGranted: amount, reason };
}

async function progressRoutes(fastify) {

  // ── POST /complete — Mark lesson as complete ──
  fastify.post('/complete', { preHandler: requireSubscription }, async (request, reply) => {
    const { lessonId, score } = request.body || {};

    if (!lessonId) {
      return reply.status(400).send({ success: false, error: 'lessonId requerido' });
    }

    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      include: {
        module: {
          include: {
            lessons: { select: { id: true } },
            course: {
              include: {
                modules: { include: { lessons: { select: { id: true } } } }
              }
            }
          }
        }
      }
    });

    if (!lesson) {
      return reply.status(404).send({ success: false, error: 'Leccion no encontrada' });
    }

    // Check if already completed
    const existing = await prisma.progress.findUnique({
      where: { userId_lessonId: { userId: request.user.id, lessonId } }
    });

    if (existing && existing.completed) {
      return reply.send({ success: true, data: { alreadyCompleted: true, xpGranted: 0 } });
    }

    // Mark complete
    await prisma.progress.upsert({
      where: { userId_lessonId: { userId: request.user.id, lessonId } },
      create: {
        userId: request.user.id,
        lessonId,
        completed: true,
        score: score || null,
        completedAt: new Date()
      },
      update: {
        completed: true,
        score: score || null,
        completedAt: new Date()
      }
    });

    const xpResults = [];

    // Grant lesson XP
    const lessonXp = lesson.xp || XP_REWARDS.LESSON_COMPLETE;
    xpResults.push(await grantXp(request.user.id, lessonXp, 'lesson_complete', { lessonId }));

    // Quiz perfect bonus
    if (lesson.type === 'QUIZ' && score === 100) {
      xpResults.push(await grantXp(request.user.id, XP_REWARDS.QUIZ_PERFECT, 'quiz_perfect', { lessonId }));
    }

    // Check module completion
    const moduleLessonIds = lesson.module.lessons.map(l => l.id);
    const moduleProgress = await prisma.progress.count({
      where: { userId: request.user.id, lessonId: { in: moduleLessonIds }, completed: true }
    });

    let moduleCompleted = false;
    if (moduleProgress >= moduleLessonIds.length) {
      moduleCompleted = true;
      xpResults.push(await grantXp(request.user.id, XP_REWARDS.MODULE_COMPLETE, 'module_complete', { moduleId: lesson.module.id }));
    }

    // Check course completion
    let courseCompleted = false;
    if (moduleCompleted) {
      const allCourseLessonIds = lesson.module.course.modules.flatMap(m => m.lessons.map(l => l.id));
      const courseProgress = await prisma.progress.count({
        where: { userId: request.user.id, lessonId: { in: allCourseLessonIds }, completed: true }
      });

      if (courseProgress >= allCourseLessonIds.length) {
        courseCompleted = true;
        xpResults.push(await grantXp(request.user.id, XP_REWARDS.COURSE_COMPLETE, 'course_complete', { courseId: lesson.module.course.id }));

        // Update enrollment status
        await prisma.enrollment.updateMany({
          where: { userId: request.user.id, courseId: lesson.module.course.id },
          data: { status: 'COMPLETED' }
        });
      }
    }

    // Get updated user
    const updatedUser = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: { xp: true, level: true }
    });

    reply.send({
      success: true,
      data: {
        lessonCompleted: true,
        moduleCompleted,
        courseCompleted,
        xpResults,
        totalXpGranted: xpResults.reduce((sum, r) => sum + r.xpGranted, 0),
        user: updatedUser
      }
    });
  });

  // ── GET /my-progress — User's overall progress ──
  fastify.get('/my-progress', { preHandler: requireSubscription }, async (request, reply) => {
    const userId = request.user.id;

    // Get all enrollments with progress
    const enrollments = await prisma.enrollment.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            modules: {
              include: { lessons: { select: { id: true } } }
            }
          }
        }
      }
    });

    const completedLessons = await prisma.progress.findMany({
      where: { userId, completed: true },
      select: { lessonId: true }
    });
    const completedIds = new Set(completedLessons.map(p => p.lessonId));

    const courseProgress = enrollments.map(e => {
      const totalLessons = e.course.modules.reduce((sum, m) => sum + m.lessons.length, 0);
      const completed = e.course.modules.reduce((sum, m) =>
        sum + m.lessons.filter(l => completedIds.has(l.id)).length, 0);

      return {
        courseId: e.course.id,
        courseTitle: e.course.title,
        courseSlug: e.course.slug,
        status: e.status,
        totalLessons,
        completedLessons: completed,
        percentage: totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0
      };
    });

    reply.send({
      success: true,
      data: {
        courses: courseProgress,
        totalCompleted: completedIds.size,
        xp: request.user.xp,
        level: request.user.level,
        streak: request.user.streak
      }
    });
  });

  // ── GET /leaderboard — Top users by XP ──
  fastify.get('/leaderboard', async (request, reply) => {
    const { period = 'weekly' } = request.query || {};

    let dateFilter = {};
    const now = new Date();
    if (period === 'weekly') {
      const monday = new Date(now);
      monday.setDate(now.getDate() - now.getDay() + 1);
      monday.setHours(0, 0, 0, 0);
      dateFilter = { createdAt: { gte: monday } };
    } else if (period === 'monthly') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = { createdAt: { gte: firstDay } };
    }

    let leaders;
    if (period === 'alltime') {
      leaders = await prisma.user.findMany({
        where: { isActive: true, role: 'STUDENT' },
        select: { id: true, name: true, avatar: true, xp: true, level: true },
        orderBy: { xp: 'desc' },
        take: 50
      });
    } else {
      // Aggregate XP from logs for the period
      const xpByUser = await prisma.xpLog.groupBy({
        by: ['userId'],
        where: dateFilter,
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 50
      });

      const userIds = xpByUser.map(x => x.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: userIds }, isActive: true },
        select: { id: true, name: true, avatar: true, xp: true, level: true }
      });

      const userMap = {};
      users.forEach(u => { userMap[u.id] = u; });

      leaders = xpByUser.map(x => ({
        ...userMap[x.userId],
        periodXp: x._sum.amount
      })).filter(l => l.name); // Filter out deleted users
    }

    reply.send({ success: true, data: { period, leaders } });
  });
}

module.exports = progressRoutes;
