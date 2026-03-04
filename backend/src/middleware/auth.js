// ============================================================
// Auth Middleware — JWT verification + role-based access
// ============================================================

const jwt = require('jsonwebtoken');
const prisma = require('../utils/prisma');

// Verify access token and attach user to request
async function authenticate(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ success: false, error: 'Token requerido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true, email: true, name: true, role: true,
        xp: true, level: true, streak: true, avatar: true, isActive: true
      }
    });

    if (!user || !user.isActive) {
      return reply.status(401).send({ success: false, error: 'Usuario no encontrado o desactivado' });
    }

    request.user = user;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return reply.status(401).send({ success: false, error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return reply.status(401).send({ success: false, error: 'Token invalido' });
  }
}

// Verify user is admin
async function requireAdmin(request, reply) {
  await authenticate(request, reply);
  if (reply.sent) return; // authenticate already sent error

  if (request.user.role !== 'ADMIN') {
    return reply.status(403).send({ success: false, error: 'Acceso denegado. Se requiere rol de administrador.' });
  }
}

// Verify user has active subscription (for premium content)
async function requireSubscription(request, reply) {
  await authenticate(request, reply);
  if (reply.sent) return;

  // Admins bypass subscription check
  if (request.user.role === 'ADMIN') return;

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: request.user.id,
      status: { in: ['ACTIVE', 'GRACE_PERIOD'] },
      expiresAt: { gt: new Date() }
    }
  });

  if (!subscription) {
    return reply.status(403).send({
      success: false,
      error: 'Se requiere suscripcion activa',
      code: 'NO_SUBSCRIPTION'
    });
  }

  request.subscription = subscription;
}

// Optional auth - attaches user if token present, continues if not
async function optionalAuth(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return;

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true, xp: true, level: true, avatar: true, isActive: true }
    });

    if (user && user.isActive) {
      request.user = user;
    }
  } catch {
    // Silent fail - user just won't be attached
  }
}

module.exports = { authenticate, requireAdmin, requireSubscription, optionalAuth };
