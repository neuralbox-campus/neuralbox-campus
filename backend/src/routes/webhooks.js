// ============================================================
// Webhook Routes — Payment confirmations from all gateways
// Wompi, MercadoPago, PayPal, CryptAPI
// ============================================================

const crypto = require('crypto');
const prisma = require('../utils/prisma');

// Plan durations in days
const PLAN_DURATION = {
  PREVENTA: 60,     // 2 months
  MONTHLY: 30,
  SEMIANNUAL: 180,
  ANNUAL: 365
};

async function activateSubscription(userId, plan, gateway, gatewayTxId, amount, currency) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PLAN_DURATION[plan] * 24 * 60 * 60 * 1000);

  const subscription = await prisma.subscription.create({
    data: {
      userId, plan, gateway, gatewayId: gatewayTxId,
      amount, currency,
      status: 'ACTIVE',
      startsAt: now,
      expiresAt
    }
  });

  await prisma.payment.create({
    data: {
      userId, subscriptionId: subscription.id,
      amount, currency, gateway, gatewayTxId,
      status: 'COMPLETED',
      paidAt: now
    }
  });

  // TODO: Send confirmation email via Resend

  return subscription;
}

async function webhookRoutes(fastify) {

  // ════════════════════════════════════════════════════════════
  // WOMPI WEBHOOK
  // ════════════════════════════════════════════════════════════
  fastify.post('/wompi', async (request, reply) => {
    try {
      // Verify webhook signature
      const signature = request.headers['x-event-checksum'];
      const event = request.body;

      if (!event || !event.data || !event.data.transaction) {
        return reply.status(400).send({ error: 'Invalid payload' });
      }

      const tx = event.data.transaction;

      // Verify signature: SHA256(tx.id + tx.status + tx.amount_in_cents + timestamp + events_secret)
      const timestamp = event.timestamp;
      const expectedSig = crypto
        .createHash('sha256')
        .update(`${tx.id}${tx.status}${tx.amount_in_cents}${timestamp}${process.env.WOMPI_EVENTS_SECRET}`)
        .digest('hex');

      if (signature !== expectedSig) {
        request.log.warn('Wompi webhook: invalid signature');
        return reply.status(401).send({ error: 'Invalid signature' });
      }

      if (tx.status === 'APPROVED') {
        // Extract user and plan from reference
        const reference = tx.reference; // Format: "neuralbox_USERID_PLAN"
        const parts = reference.split('_');
        if (parts.length < 3) {
          request.log.warn('Wompi webhook: invalid reference format');
          return reply.status(400).send({ error: 'Invalid reference' });
        }

        const userId = parts[1];
        const plan = parts[2]; // PREVENTA, MONTHLY, SEMIANNUAL, ANNUAL

        await activateSubscription(
          userId, plan, 'WOMPI', tx.id,
          tx.amount_in_cents, tx.currency
        );

        request.log.info(`Wompi: Subscription activated for user ${userId}, plan ${plan}`);
      }

      reply.send({ status: 'ok' });
    } catch (err) {
      request.log.error('Wompi webhook error:', err);
      reply.status(500).send({ error: 'Internal error' });
    }
  });

  // ════════════════════════════════════════════════════════════
  // MERCADOPAGO WEBHOOK
  // ════════════════════════════════════════════════════════════
  fastify.post('/mercadopago', async (request, reply) => {
    try {
      const { type, data } = request.body || {};

      if (type === 'payment') {
        // Fetch payment details from MP API
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
          headers: { 'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}` }
        });
        const payment = await mpResponse.json();

        if (payment.status === 'approved') {
          const metadata = payment.metadata || {};
          const userId = metadata.user_id;
          const plan = metadata.plan;

          if (userId && plan) {
            await activateSubscription(
              userId, plan, 'MERCADOPAGO', String(payment.id),
              payment.transaction_amount * 100, payment.currency_id
            );
            request.log.info(`MercadoPago: Subscription activated for user ${userId}, plan ${plan}`);
          }
        }
      }

      reply.send({ status: 'ok' });
    } catch (err) {
      request.log.error('MercadoPago webhook error:', err);
      reply.status(500).send({ error: 'Internal error' });
    }
  });

  // ════════════════════════════════════════════════════════════
  // PAYPAL WEBHOOK
  // ════════════════════════════════════════════════════════════
  fastify.post('/paypal', async (request, reply) => {
    try {
      const event = request.body;

      // TODO: Verify PayPal webhook signature (requires PayPal SDK)

      if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
        const capture = event.resource;
        const customId = capture.custom_id; // Format: "USERID_PLAN"
        const parts = customId ? customId.split('_') : [];

        if (parts.length >= 2) {
          const userId = parts[0];
          const plan = parts[1];
          const amount = Math.round(parseFloat(capture.amount.value) * 100);

          await activateSubscription(
            userId, plan, 'PAYPAL', capture.id,
            amount, capture.amount.currency_code
          );
          request.log.info(`PayPal: Subscription activated for user ${userId}, plan ${plan}`);
        }
      }

      reply.send({ status: 'ok' });
    } catch (err) {
      request.log.error('PayPal webhook error:', err);
      reply.status(500).send({ error: 'Internal error' });
    }
  });

  // ════════════════════════════════════════════════════════════
  // CRYPTAPI WEBHOOK
  // ════════════════════════════════════════════════════════════
  fastify.get('/crypto', async (request, reply) => {
    // CryptAPI sends callbacks as GET requests
    try {
      const {
        uuid, address_in, address_out,
        txid_in, txid_out,
        confirmations, value_coin, value_forward,
        coin, pending
      } = request.query;

      // Only process confirmed transactions
      if (parseInt(pending) === 1) {
        return reply.send('*ok*'); // Acknowledge but wait for confirmation
      }

      // Extract userId and plan from the callback URL params
      const userId = request.query.user_id;
      const plan = request.query.plan;

      if (!userId || !plan) {
        request.log.warn('CryptAPI callback: missing user_id or plan');
        return reply.send('*ok*');
      }

      // Verify this hasn't been processed already
      const existingPayment = await prisma.payment.findFirst({
        where: { gatewayTxId: txid_in, gateway: 'CRYPTAPI' }
      });

      if (!existingPayment) {
        const amount = Math.round(parseFloat(value_coin) * 100); // Store as cents equivalent

        await activateSubscription(
          userId, plan, 'CRYPTAPI', txid_in,
          amount, coin.toUpperCase()
        );

        request.log.info(`CryptAPI: Subscription activated for user ${userId}, plan ${plan}, coin ${coin}`);
      }

      reply.send('*ok*'); // CryptAPI expects "*ok*" as response
    } catch (err) {
      request.log.error('CryptAPI webhook error:', err);
      reply.send('*ok*'); // Always respond ok to prevent retries
    }
  });
}

module.exports = webhookRoutes;
