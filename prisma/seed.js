// ============================================================
// Database Seed — Initial data for NeuralBox Campus
// Run: node prisma/seed.js
// ============================================================

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding NeuralBox Campus database...');

  // ─── Admin User (Cuantico) ──────────────────────────────
  const adminPassword = await bcrypt.hash('NeuralBox2026!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@neuralboxai.com' },
    update: {},
    create: {
      email: 'admin@neuralboxai.com',
      passwordHash: adminPassword,
      name: 'Cuantico',
      role: 'ADMIN',
      xp: 0,
      level: 1
    }
  });
  console.log(`  Admin created: ${admin.email}`);

  // ─── Categories ─────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'fundamentos-ia' },
      update: {},
      create: { name: 'Fundamentos de IA', slug: 'fundamentos-ia', description: 'Aprende los conceptos basicos de la Inteligencia Artificial', icon: 'brain', order: 1 }
    }),
    prisma.category.upsert({
      where: { slug: 'prompting' },
      update: {},
      create: { name: 'Prompting & LLMs', slug: 'prompting', description: 'Domina el arte de comunicarte con modelos de lenguaje', icon: 'message-square', order: 2 }
    }),
    prisma.category.upsert({
      where: { slug: 'automatizacion' },
      update: {},
      create: { name: 'Automatizacion con IA', slug: 'automatizacion', description: 'Automatiza procesos y flujos de trabajo con IA', icon: 'zap', order: 3 }
    }),
    prisma.category.upsert({
      where: { slug: 'agentes-ia' },
      update: {},
      create: { name: 'Agentes de IA', slug: 'agentes-ia', description: 'Construye agentes autonomos que trabajan por ti', icon: 'bot', order: 4 }
    }),
    prisma.category.upsert({
      where: { slug: 'negocio-ia' },
      update: {},
      create: { name: 'IA para Negocios', slug: 'negocio-ia', description: 'Aplica IA para hacer crecer tu negocio', icon: 'trending-up', order: 5 }
    }),
  ]);
  console.log(`  ${categories.length} categories created`);

  // ─── Sample Course ──────────────────────────────────────
  const course = await prisma.course.upsert({
    where: { slug: 'intro-ia-desde-cero' },
    update: {},
    create: {
      categoryId: categories[0].id,
      title: 'Introduccion a la IA desde Cero',
      slug: 'intro-ia-desde-cero',
      description: 'Tu primer paso en el mundo de la Inteligencia Artificial. Aprende que es la IA, como funciona y como puedes usarla en tu vida profesional.',
      status: 'PUBLISHED',
      order: 1
    }
  });

  const module1 = await prisma.module.upsert({
    where: { id: 'mod-intro-1' },
    update: {},
    create: {
      id: 'mod-intro-1',
      courseId: course.id,
      title: 'Que es la Inteligencia Artificial',
      description: 'Conceptos fundamentales y tipos de IA',
      order: 1
    }
  });

  const lessons = [
    { title: 'Bienvenida al curso', type: 'VIDEO', duration: 5, xp: 25, order: 1 },
    { title: 'Historia de la IA: de Turing a ChatGPT', type: 'VIDEO', duration: 15, xp: 50, order: 2 },
    { title: 'Tipos de IA: Narrow, General y Super', type: 'VIDEO', duration: 12, xp: 50, order: 3 },
    { title: 'Machine Learning vs Deep Learning', type: 'TEXT', duration: 8, xp: 40, order: 4 },
    { title: 'Quiz: Fundamentos de IA', type: 'QUIZ', duration: 5, xp: 75, order: 5 },
  ];

  for (const lesson of lessons) {
    await prisma.lesson.upsert({
      where: { id: `les-${module1.id}-${lesson.order}` },
      update: {},
      create: {
        id: `les-${module1.id}-${lesson.order}`,
        moduleId: module1.id,
        ...lesson
      }
    });
  }
  console.log(`  Course "${course.title}" with ${lessons.length} lessons created`);

  // ─── Community Channels ─────────────────────────────────
  const channels = await Promise.all([
    prisma.channel.upsert({
      where: { slug: 'freebox' },
      update: {},
      create: { name: 'FreeBox', slug: 'freebox', description: 'Canal abierto para todos. Presentate y conecta con la comunidad.', type: 'FREEBOX', icon: 'gift', order: 1 }
    }),
    prisma.channel.upsert({
      where: { slug: 'general' },
      update: {},
      create: { name: 'General', slug: 'general', description: 'Conversaciones generales sobre IA', type: 'PUBLIC', icon: 'hash', order: 2 }
    }),
    prisma.channel.upsert({
      where: { slug: 'ia-noticias' },
      update: {},
      create: { name: 'IA Noticias', slug: 'ia-noticias', description: 'Ultimas noticias y avances en Inteligencia Artificial', type: 'PUBLIC', icon: 'newspaper', order: 3 }
    }),
    prisma.channel.upsert({
      where: { slug: 'proyectos' },
      update: {},
      create: { name: 'Proyectos', slug: 'proyectos', description: 'Comparte tus proyectos y recibe feedback', type: 'PUBLIC', icon: 'code', order: 4 }
    }),
    prisma.channel.upsert({
      where: { slug: 'memes' },
      update: {},
      create: { name: 'Memes', slug: 'memes', description: 'Los mejores memes de IA', type: 'PUBLIC', icon: 'smile', order: 5 }
    }),
    prisma.channel.upsert({
      where: { slug: 'soporte' },
      update: {},
      create: { name: 'Soporte', slug: 'soporte', description: 'Necesitas ayuda? Pregunta aqui', type: 'PUBLIC', icon: 'help-circle', order: 6 }
    }),
  ]);
  console.log(`  ${channels.length} community channels created`);

  // ─── Badges ─────────────────────────────────────────────
  const badges = [
    { name: 'Primer Paso', description: 'Completaste tu primera leccion', icon: 'rocket', criteriaType: 'lessons_completed', criteriaValue: 1 },
    { name: 'Explorador IA', description: 'Completaste tu primer curso', icon: 'compass', criteriaType: 'courses_completed', criteriaValue: 1 },
    { name: 'En Llamas', description: 'Racha de 7 dias consecutivos', icon: 'flame', criteriaType: 'streak_days', criteriaValue: 7 },
    { name: 'Imparable', description: 'Racha de 30 dias consecutivos', icon: 'zap', criteriaType: 'streak_days', criteriaValue: 30 },
    { name: 'Voz de la Comunidad', description: '50 posts publicados', icon: 'megaphone', criteriaType: 'posts_count', criteriaValue: 50 },
    { name: 'Leyenda', description: 'Alcanzaste el nivel 50', icon: 'crown', criteriaType: 'level', criteriaValue: 50 },
    { name: 'Early Adopter', description: 'Compraste en preventa', icon: 'star', criteriaType: 'plan_type', criteriaValue: 0 },
    { name: 'Suscriptor OG', description: 'Primer mes como premium', icon: 'diamond', criteriaType: 'subscription_months', criteriaValue: 1 },
  ];

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { id: `badge-${badge.criteriaType}-${badge.criteriaValue}` },
      update: {},
      create: { id: `badge-${badge.criteriaType}-${badge.criteriaValue}`, ...badge }
    });
  }
  console.log(`  ${badges.length} badges created`);

  console.log('\nSeed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
