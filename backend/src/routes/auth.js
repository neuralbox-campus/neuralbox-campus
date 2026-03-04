// ============================================================
// Auth Routes — Register, Login, Refresh, Forgot Password
// Rate limited: 5 attempts / 15 min for login
// ============================================================

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../utils/prisma');
const { authenticate } = require('../middleware/auth');

// ─── Validation Schemas ─────────────────────────────────────

const registerSchema = z.object({
  email: z.string().email('Email invalido').max(255).toLowerCase().trim(),
  password: z.string().min(8, 'Minimo 8 caracteres').max(128),
  name: z.string().min(2, 'Minimo 2 caracteres').max(100).trim()
});

const loginSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string().min(1).max(128)
});

const forgotSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim()
});

const resetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128)
});

// ─── Helpers ────────────────────────────────────────────────

function generateAccessToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m'
  });
}

async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prisma.refreshToken.create({
    data: { token, userId, expiresAt }
  });

  return token;
}

function sanitizeUser(user) {
  const { passwordHash, ...safe } = user;
  return safe;
}

// ─── Routes ─────────────────────────────────────────────────

async function authRoutes(fastify) {

  // ── REGISTER ──
  fastify.post('/register', async (request, reply) => {
    const data = registerSchema.parse(request.body);

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return reply.status(409).send({ success: false, error: 'Este email ya esta registrado' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        passwordHash,
        name: data.name
      }
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    // TODO: Send welcome email via Resend

    reply.status(201).send({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken
      }
    });
  });

  // ── LOGIN ──
  fastify.post('/login', {
    config: {
      rateLimit: { max: 5, timeWindow: '15 minutes' }
    }
  }, async (request, reply) => {
    const data = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });
    if (!user || !user.isActive) {
      return reply.status(401).send({ success: false, error: 'Credenciales invalidas' });
    }

    const validPassword = await bcrypt.compare(data.password, user.passwordHash);
    if (!validPassword) {
      return reply.status(401).send({ success: false, error: 'Credenciales invalidas' });
    }

    // Update last active
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() }
    });

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    reply.send({
      success: true,
      data: {
        user: sanitizeUser(user),
        accessToken,
        refreshToken
      }
    });
  });

  // ── REFRESH TOKEN ──
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body || {};
    if (!refreshToken) {
      return reply.status(400).send({ success: false, error: 'Refresh token requerido' });
    }

    // Find and validate token
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      // Clean up expired token
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      return reply.status(401).send({ success: false, error: 'Refresh token invalido o expirado' });
    }

    // Rotate: delete old, create new
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const newAccessToken = generateAccessToken(stored.userId);
    const newRefreshToken = await generateRefreshToken(stored.userId);

    reply.send({
      success: true,
      data: { accessToken: newAccessToken, refreshToken: newRefreshToken }
    });
  });

  // ── LOGOUT ──
  fastify.post('/logout', { preHandler: authenticate }, async (request, reply) => {
    const { refreshToken } = request.body || {};
    if (refreshToken) {
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken, userId: request.user.id }
      });
    }

    reply.send({ success: true, message: 'Sesion cerrada' });
  });

  // ── ME (get current user) ──
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      select: {
        id: true, email: true, name: true, avatar: true, role: true,
        xp: true, level: true, streak: true, lastActiveAt: true, createdAt: true,
        subscriptions: {
          where: { status: { in: ['ACTIVE', 'GRACE_PERIOD'] }, expiresAt: { gt: new Date() } },
          select: { id: true, plan: true, status: true, expiresAt: true },
          take: 1
        },
        _count: { select: { badges: true, progress: { where: { completed: true } } } }
      }
    });

    reply.send({
      success: true,
      data: {
        ...user,
        hasActiveSubscription: user.subscriptions.length > 0,
        currentPlan: user.subscriptions[0] || null,
        completedLessons: user._count.progress,
        totalBadges: user._count.badges
      }
    });
  });

  // ── FORGOT PASSWORD ──
  fastify.post('/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '15 minutes' } }
  }, async (request, reply) => {
    const data = forgotSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email: data.email } });

    // Always return success (don't reveal if email exists)
    if (!user) {
      return reply.send({ success: true, message: 'Si el email existe, recibiras un enlace de recuperacion.' });
    }

    // Generate reset token (stored as a special refresh token with short expiry)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.refreshToken.create({
      data: { token: `reset_${resetToken}`, userId: user.id, expiresAt }
    });

    // TODO: Send email with reset link via Resend
    // const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    reply.send({ success: true, message: 'Si el email existe, recibiras un enlace de recuperacion.' });
  });

  // ── RESET PASSWORD ──
  fastify.post('/reset-password', async (request, reply) => {
    const data = resetSchema.parse(request.body);

    const stored = await prisma.refreshToken.findUnique({
      where: { token: `reset_${data.token}` }
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      return reply.status(400).send({ success: false, error: 'Token invalido o expirado' });
    }

    const passwordHash = await bcrypt.hash(data.password, parseInt(process.env.BCRYPT_ROUNDS || '12'));

    await prisma.user.update({
      where: { id: stored.userId },
      data: { passwordHash }
    });

    // Clean up reset token
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    // Invalidate all other refresh tokens for this user (force re-login everywhere)
    await prisma.refreshToken.deleteMany({ where: { userId: stored.userId } });

    reply.send({ success: true, message: 'Contrasena actualizada. Inicia sesion con tu nueva contrasena.' });
  });
}

module.exports = authRoutes;
