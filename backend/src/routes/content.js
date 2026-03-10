// ============================================================
// Content Routes — Courses, Modules, Lessons (public catalog)
// Protected: actual lesson content requires subscription
// ============================================================

const prisma = require('../utils/prisma');
const { optionalAuth, requireSubscription } = require('../middleware/auth');

async function contentRoutes(fastify) {

  // ── GET /categories — Public catalog ──
  fastify.get('/categories', async (request, reply) => {
    const categories = await prisma.category.findMany({
      orderBy: { order: 'asc' },
      include: {
        courses: {
          where: { status: 'PUBLISHED' },
          orderBy: { order: 'asc' },
          select: {
            id: true, title: true, slug: true, description: true,
            thumbnail: true,
            _count: { select: { modules: true } }
          }
        }
      }
    });

    reply.send({ success: true, data: categories });
  });

  // ── GET /courses — List all published courses with modules ──
  fastify.get('/courses', async (request, reply) => {
    const courses = await prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { order: 'asc' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: { id: true, title: true, type: true, duration: true, xp: true, order: true }
            }
          }
        },
        _count: { select: { enrollments: true } }
      }
    });
    reply.send({ success: true, data: courses });
  });

  // ── GET /courses/:slug — Course detail with modules ──
  fastify.get('/courses/:slug', { preHandler: optionalAuth }, async (request, reply) => {
    const course = await prisma.course.findUnique({
      where: { slug: request.params.slug, status: 'PUBLISHED' },
      include: {
        category: { select: { id: true, name: true, slug: true } },
        modules: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              select: {
                id: true, title: true, type: true, duration: true, xp: true, order: true
                // Note: videoUrl and content NOT included (premium)
              }
            }
          }
        },
        _count: {
          select: { enrollments: true }
        }
      }
    });

    if (!course) {
      return reply.status(404).send({ success: false, error: 'Curso no encontrado' });
    }

    // If user is authenticated, include their progress
    let userProgress = null;
    if (request.user) {
      const lessonIds = course.modules.flatMap(m => m.lessons.map(l => l.id));
      const progress = await prisma.progress.findMany({
        where: { userId: request.user.id, lessonId: { in: lessonIds } }
      });
      userProgress = {};
      progress.forEach(p => { userProgress[p.lessonId] = { completed: p.completed, score: p.score }; });
    }

    reply.send({
      success: true,
      data: {
        ...course,
        totalStudents: course._count.enrollments,
        totalLessons: course.modules.reduce((sum, m) => sum + m.lessons.length, 0),
        totalDuration: course.modules.reduce((sum, m) =>
          sum + m.lessons.reduce((s, l) => s + (l.duration || 0), 0), 0),
        userProgress
      }
    });
  });

  // ── GET /modules/:moduleId/lessons — List lessons in a module ──
  fastify.get('/modules/:moduleId/lessons', { preHandler: optionalAuth }, async (request, reply) => {
    const module = await prisma.module.findUnique({
      where: { id: request.params.moduleId },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        lessons: {
          orderBy: { order: 'asc' },
          select: { id: true, title: true, type: true, duration: true, xp: true, order: true }
        }
      }
    });

    if (!module) {
      return reply.status(404).send({ success: false, error: 'Modulo no encontrado' });
    }

    reply.send({ success: true, data: { module, lessons: module.lessons } });
  });

  // ── GET /lessons/:id — Full lesson content (PREMIUM) ──
  fastify.get('/lessons/:id', { preHandler: requireSubscription }, async (request, reply) => {
    const lesson = await prisma.lesson.findUnique({
      where: { id: request.params.id },
      include: {
        module: {
          include: {
            course: { select: { id: true, title: true, slug: true } },
            lessons: {
              orderBy: { order: 'asc' },
              select: { id: true, title: true, type: true, order: true, duration: true }
            }
          }
        }
      }
    });

    if (!lesson) {
      return reply.status(404).send({ success: false, error: 'Leccion no encontrada' });
    }

    // Get user progress for this lesson
    const progress = await prisma.progress.findUnique({
      where: { userId_lessonId: { userId: request.user.id, lessonId: lesson.id } }
    });

    // Generate signed video URL if it's a video lesson
    let signedVideoUrl = null;
    if (lesson.type === 'VIDEO' && lesson.videoUrl) {
      // TODO: Generate Bunny Stream signed URL
      signedVideoUrl = lesson.videoUrl; // Placeholder until Bunny integration
    }

    // Auto-enroll user in course if not already
    await prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId: request.user.id, courseId: lesson.module.course.id }
      },
      create: { userId: request.user.id, courseId: lesson.module.course.id },
      update: {}
    });

    reply.send({
      success: true,
      data: {
        ...lesson,
        videoUrl: signedVideoUrl,
        userProgress: progress || { completed: false, score: null },
        siblings: lesson.module.lessons, // For prev/next navigation
        course: lesson.module.course
      }
    });
  });
}

module.exports = contentRoutes;
