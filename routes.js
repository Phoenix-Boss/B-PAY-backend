import express from 'express';
import { Paystack } from './providers/paystack.js';
import { Payscribe } from './providers/payscribe.js';
import { Juicyway } from './providers/juicyway.js';
import { Korapay } from './providers/korapay.js';
import { log, formatPayload, generateReference } from './utils/helpers.js';

const router = express.Router();

// ==================================================
// 🧠 SMART ROUTING CONFIGURATION
// ==================================================

const ROUTING_RULES = {
  collect_payment: 'paystack',
  bank_transfer: 'payscribe',
  payout: 'korapay',
  international: 'juicyway',
};

const getProvider = (name) => {
  switch (name.toLowerCase()) {
    case 'paystack': return new Paystack();
    case 'payscribe': return new Payscribe();
    case 'juicyway': return new Juicyway();
    case 'korapay': return new Korapay();
    default: throw new Error(`Provider '${name}' not supported`);
  }
};

// ==================================================
// 🔔 WEBHOOK HANDLER STUBS (routing skeleton only)
// ==================================================
// NOTE: none of these verify a signature yet — that's Tasks 3-6 in
// handover.md, one provider each, so they can land independently
// without fighting over this file. For now each stub just
// acknowledges receipt so the provider doesn't retry-storm us while
// real handling isn't implemented.
//
// ⚠️ express.json() (set up in index.js) parses the body and doesn't
// keep the raw bytes around. Paystack's docs explicitly compute the
// HMAC signature over the *raw* request body, so whichever task
// implements Paystack verification first will likely need to switch
// to something like:
//   express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })
// so `req.rawBody` is available alongside the parsed `req.body`. Not
// done here — this task is only the routing skeleton.
const webhookHandlers = {
  paystack: async (req) => {
    log(`Paystack webhook stub received (no verification yet): ${formatPayload(req.body)}`);
    // TODO (Task 3): verify x-paystack-signature (HMAC-SHA512 of raw body), then handle event
    return { received: true };
  },
  korapay: async (req) => {
    log(`Korapay webhook stub received (no verification yet): ${formatPayload(req.body)}`);
    // TODO (Task 4): verify x-korapay-signature (HMAC-SHA256), then handle event
    return { received: true };
  },
  juicyway: async (req) => {
    log(`Juicyway webhook stub received (no verification yet): ${formatPayload(req.body)}`);
    // TODO (Task 5): find + verify Juicyway's signature scheme, then handle event
    return { received: true };
  },
  payscribe: async (req) => {
    log(`Payscribe webhook stub received (no verification yet): ${formatPayload(req.body)}`);
    // TODO (Task 6): find + verify Payscribe's signature scheme, then handle event
    return { received: true };
  },
};

// ==================================================
// 🛣️ ROUTES
// ==================================================

// POST /api/pay
router.post('/pay', async (req, res) => {
  try {
    const { action, provider, amount, customer, currency, reference } = req.body;

    log(`Payment Request Received: ${formatPayload(req.body)}`);

    // Validate required fields
    if (!amount) {
      return res.status(400).json({ 
        status: false, 
        message: 'Missing required field: amount' 
      });
    }

    // Smart Routing: Determine provider from action OR explicit provider field
    let providerName = provider;
    if (!providerName && action) {
      providerName = ROUTING_RULES[action] || 'paystack';
    }
    if (!providerName) {
      providerName = 'paystack'; // Default fallback
    }

    log(`Routing to provider: '${providerName}'`);

    const providerInstance = getProvider(providerName);
    
    const ref = reference || generateReference(providerName);
    
    const paymentData = {
      amount,
      currency: currency || 'NGN',
      reference: ref,
      customer,
    };

    const result = await providerInstance.processPayment(paymentData);

    log(`Payment Success: ${providerName} - ${ref}`);

    return res.status(200).json({
      status: true,
      message: 'Payment initiated successfully',
      provider: providerName,
      reference: ref,
      data: result,
    });

  } catch (error) {
    log(`Payment Error: ${error.message}`, 'error');
    return res.status(500).json({
      status: false,
      message: error.message || 'Payment processing failed',
    });
  }
});

// GET /api/verify?reference=XYZ&provider=paystack
router.get('/verify', async (req, res) => {
  try {
    const { reference, provider } = req.query;

    log(`Verification Request Received: ${formatPayload(req.query)}`);

    if (!reference || !provider) {
      return res.status(400).json({ 
        status: false, 
        message: 'Missing query params: reference, provider' 
      });
    }

    const providerInstance = getProvider(provider);
    const result = await providerInstance.verifyTransaction(reference);

    log(`Verification Success: ${provider} - ${reference}`);

    return res.status(200).json({
      status: true,
      message: 'Verification successful',
      provider,
      data: result,
    });

  } catch (error) {
    log(`Verification Error: ${error.message}`, 'error');
    return res.status(500).json({
      status: false,
      message: error.message || 'Verification failed',
    });
  }
});

// POST /api/webhooks/:provider
// Routing skeleton only (Task 2) — logs the raw body + headers, hands
// off to the per-provider stub above, stores nothing yet, always
// returns 200 so the provider doesn't treat this as a delivery
// failure and retry-storm us while real handling isn't implemented.
router.post('/webhooks/:provider', async (req, res) => {
  const { provider } = req.params;

  try {
    log(`Webhook received for provider '${provider}'`);
    log(`Webhook headers: ${JSON.stringify(req.headers, null, 2)}`);
    log(`Webhook body: ${formatPayload(req.body)}`);

    const handler = webhookHandlers[provider?.toLowerCase()];

    if (!handler) {
      log(`Webhook Error: unknown provider '${provider}'`, 'error');
      return res.status(404).json({ status: false, message: `Unknown webhook provider: ${provider}` });
    }

    await handler(req);

    // Always ack with 200 at this stage — no signature verification or
    // real handling exists yet (see Tasks 3-6), so there's nothing to
    // reject on. Once verification lands, an invalid signature should
    // return 401 instead of falling through to this 200.
    return res.status(200).json({ status: true, message: 'Webhook received' });

  } catch (error) {
    log(`Webhook Error: ${error.message}`, 'error');
    return res.status(500).json({ status: false, message: error.message || 'Webhook processing failed' });
  }
});

export default router;