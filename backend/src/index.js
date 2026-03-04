// ============================================================
// NeuralBox Campus IA — Backend Entry Point
// Fastify server with security, rate limiting, and CORS
// ============================================================

require('dotenv').config();
const Fastify = require('fastify');
const cors = require('@fastify/cors');
const helmet = require('@fastify/helmet');
const rateLimit = require('@fastify/rate-limit');

const authRoutes = require('./routes/auth');
const contentRoutes = require('./routes/content');
const progressRoutes = require('./routes/progress');
const communityRoutes = require('./routes/community');
const adminRoutes = require('./routes/admin');
const webhookRoutes = require('./routes/webhooks');

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined
  }
});

// ─── Security Plugins ───────────────────────────────────────

app.register(helmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", process.env.API_URL],
      mediaSrc: ["'self'", "https://*.b-cdn.net"],
    }
  }
});

app.register(cors, {
  origin: [
    process.env.FRONTEND_URL,
    'https://campus.neuralboxai.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
});

app.register(rateLimit, {
  max: 100,
  timeWindow: '15 minutes',
  keyGenerator: (req) => req.ip
});

// ─── Health Check ───────────────────────────────────────────

app.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' };
});

// ─── Routes ─────────────────────────────────────────────────

app.register(authRoutes, { prefix: '/api/auth' });
app.register(contentRoutes, { prefix: '/api/content' });
app.register(progressRoutes, { prefix: '/api/progress' });
app.register(communityRoutes, { prefix: '/api/community' });
app.register(adminRoutes, { prefix: '/api/admin' });
app.register(webhookRoutes, { prefix: '/api/webhooks' });

// ─── Error Handler ──────────────────────────────────────────

app.setErrorHandler((error, request, reply) => {
  app.log.error(error);

  // Zod validation errors
  if (error.name === 'ZodError') {
    return reply.status(400).send({
      success: false,
      error: 'Datos invalidos',
      details: error.issues.map(i => ({ field: i.path.join('.'), message: i.message }))
    });
  }

  // Rate limit
  if (error.statusCode === 429) {
    return reply.status(429).send({
      success: false,
      error: 'Demasiadas solicitudes. Intenta en unos minutos.'
    });
  }

  // Default
  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    success: false,
    error: statusCode === 500 ? 'Error interno del servidor' : error.message
  });
});

// ─── Start ──────────────────────────────────────────────────

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3001');
    await app.listen({ port, host: '0.0.0.0' });
    app.log.info(`NeuralBox Campus API running on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
