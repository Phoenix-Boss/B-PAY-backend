import express from 'express';
import { Paystack } from './providers/paystack.js';
import { Payscribe } from './providers/payscribe.js';
import { Juicyway } from './providers/juicyway.js';
import { Korapay } from './providers/korapay.js';
import { log, formatPayload, generateReference, getSupportedCurrencies, isValidCurrencyCode, isValidEmail, providerRequiresEmail } from './utils/helpers.js';

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

// Task 10 (Korapay-focus partial — see handover.md's "Current focus:
// Korapay only" section): ROUTING_RULES above still only maps an
// abstract `action` string to a provider with zero awareness of
// currency, exactly the gap this task describes. A full fix (pick a
// provider from currency+country, across all four providers) isn't
// possible yet — Paystack and Korapay are the only two providers with
// a confirmed currency list (see getSupportedCurrencies() in
// utils/helpers.js); JuicyWay and Payscribe aren't confirmed and we
// have no working keys to verify a guess against.
//
// What this DOES do now: once a provider has been chosen (via explicit
// `provider`, or via `action` -> ROUTING_RULES), if that provider is
// one of the two with a confirmed list, the requested currency is
// checked against it *before* ever calling the provider. A mismatch
// returns a clear 400 naming the currency and the provider — not the
// silent 100-guaranteed-to-fail-downstream behavior the task
// description calls out. For juicyway/payscribe this check is skipped
// entirely (falls through, same behavior as before this task) since
// there's nothing confirmed yet to validate against — see
// handover.md's Task 10 note for what's left once those two providers
// have their own confirmed currency lists.
// Task 11: basic request-shape validation on POST /pay, run before any
// provider is even resolved. Previously the only check here was
// `if (!amount)` — which passed for negative numbers, non-numeric
// strings, etc. — everything else fell through to whichever provider's
// API happened to reject it, usually with a far less specific error.
function assertValidAmount(amount) {
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    const err = new Error(
      `'amount' must be a positive number (received: ${JSON.stringify(amount)})`
    );
    err.statusCode = 400;
    throw err;
  }
}

// Shape-only check (3-letter code) — this is deliberately NOT the same
// thing as assertCurrencySupported below, which checks against a
// specific provider's confirmed-supported list. This one just rejects
// obviously malformed input (e.g. "Naira", "12", "") before routing
// even happens.
function assertValidCurrencyFormat(currency) {
  if (!isValidCurrencyCode(currency)) {
    const err = new Error(
      `'currency' must be a 3-letter code, e.g. 'NGN' (received: ${JSON.stringify(currency)})`
    );
    err.statusCode = 400;
    throw err;
  }
}

// Only enforced for providers confirmed (by reading their
// processPayment() call sites, see utils/helpers.js's
// PROVIDERS_REQUIRING_EMAIL note) to forward the email with no
// fallback default. Payscribe is excluded on purpose — see that note.
function assertValidCustomerEmail(providerName, customer) {
  if (!providerRequiresEmail(providerName)) return;
  if (!isValidEmail(customer?.email)) {
    const err = new Error(
      `'customer.email' is required and must be a valid email address for provider '${providerName}' (received: ${JSON.stringify(customer?.email)})`
    );
    err.statusCode = 400;
    throw err;
  }
}

function assertCurrencySupported(providerName, currency) {
  const supported = getSupportedCurrencies(providerName);
  if (!supported) return; // not yet confirmed for this provider — can't validate, don't guess

  const currencyUpper = (currency || '').toUpperCase();
  if (!supported.includes(currencyUpper)) {
    const err = new Error(
      `Currency '${currencyUpper}' is not supported by provider '${providerName}'. Supported: ${supported.join(', ')}`
    );
    err.statusCode = 400;
    throw err;
  }
}

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
// 🔔 WEBHOOK HANDLERS
// ==================================================
// Paystack (Task 3), Korapay (Task 4), and Juicyway (Task 5) now do
// real signature/checksum verification — see
// providers/paystack.js#verifyWebhookSignature,
// providers/korapay.js#verifyWebhookSignature, and
// providers/juicyway.js#verifyWebhookSignature. Payscribe (Task 6) is
// still a stub that just acknowledges receipt without verifying
// anything yet (blocked on PENDING_DOCS in handover.md), so the
// provider doesn't retry-storm us while real handling isn't
// implemented for it.
//
// Raw-body note from Task 2 has now been checked against Paystack's,
// Korapay's, and Juicyway's own official examples and does NOT apply
// to any of the three — all hash/checksum the express.json()-parsed-
// and-re-serialized body (or, for Juicyway, a checksum field inside
// that body), not raw bytes. Leaving the note for Payscribe still,
// since that provider's actual signature requirements haven't been
// confirmed yet (see handover.md's findings section) — it may turn
// out to genuinely need
// `express.json({ verify: (req, res, buf) => { req.rawBody = buf; } })`.
const webhookHandlers = {
  paystack: async (req) => {
    const provider = new Paystack();
    const signature = req.headers['x-paystack-signature'];

    if (!provider.verifyWebhookSignature(req.body, signature)) {
      log(`Paystack webhook signature verification FAILED`, 'error');
      const err = new Error('Invalid webhook signature');
      err.statusCode = 401;
      throw err;
    }

    log(`Paystack webhook signature verified OK`);

    const { event, data } = req.body || {};
    log(`Paystack webhook event: ${event}`);

    switch (event) {
      case 'charge.success':
        // Per paystack.com/docs/payments/webhooks/, this is the
        // authoritative "payment actually succeeded" signal — more
        // reliable than the client-side redirect/callback. No
        // persistence layer exists yet (see Task 12), so for now this
        // just logs the confirmed transaction; a future task wires
        // this into whatever store Task 12 decides on.
        log(`Paystack charge.success: reference=${data?.reference}, amount=${data?.amount}, status=${data?.status}`);
        break;
      default:
        // Paystack's docs list no dedicated "charge failed" event —
        // failures simply don't raise a webhook, so every other event
        // type here (transfer.*, refund.*, subscription.*, dispute.*,
        // etc.) is just acknowledged and logged for now, not acted on.
        log(`Paystack webhook event '${event}' received, no handler wired yet — logged only`);
    }

    return { received: true };
  },
  korapay: async (req) => {
    const provider = new Korapay();
    const signature = req.headers['x-korapay-signature'];

    if (!provider.verifyWebhookSignature(req.body, signature)) {
      log(`Korapay webhook signature verification FAILED`, 'error');
      const err = new Error('Invalid webhook signature');
      err.statusCode = 401;
      throw err;
    }

    log(`Korapay webhook signature verified OK`);

    const { event, data } = req.body || {};
    log(`Korapay webhook event: ${event}`);

    switch (event) {
      case 'charge.success':
      case 'charge.failed':
      case 'transfer.success':
      case 'transfer.failed':
      case 'refund.success':
      case 'refund.failed':
        // Per developers.korapay.com/docs/webhooks, `data.status` is
        // always 'success' or 'failed' regardless of which of these
        // six event names fired, so this just logs the outcome — no
        // persistence layer exists yet (see Task 12).
        log(`Korapay ${event}: reference=${data?.reference}, amount=${data?.amount}, currency=${data?.currency}, status=${data?.status}`);
        break;
      default:
        log(`Korapay webhook event '${event}' received, no handler wired yet — logged only`);
    }

    return { received: true };
  },
  juicyway: async (req) => {
    const provider = new Juicyway();

    // Unlike Paystack/Korapay, Juicyway has no signature HTTP header --
    // the checksum lives inside the JSON body itself, so the whole
    // parsed body is passed in, not a header value. See
    // providers/juicyway.js#verifyWebhookSignature for the full scheme.
    if (!provider.verifyWebhookSignature(req.body)) {
      log(`Juicyway webhook signature verification FAILED`, 'error');
      const err = new Error('Invalid webhook signature');
      err.statusCode = 401;
      throw err;
    }

    log(`Juicyway webhook signature verified OK`);

    const { event, data } = req.body || {};
    log(`Juicyway webhook event: ${event}`);

    switch (event) {
      case 'payment.session.succeeded':
      case 'payment.session.failed':
        // Per docs.juicyway.com/webhooks, `data.status` is 'success' or
        // 'failed' regardless of which of these two events fired. No
        // persistence layer exists yet (see Task 12).
        log(`Juicyway ${event}: reference=${data?.reference}, amount=${data?.amount}, currency=${data?.currency}, status=${data?.status}`);
        break;
      default:
        log(`Juicyway webhook event '${event}' received, no handler wired yet — logged only`);
    }

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

    // Task 11: validate request shape before doing anything else —
    // amount must actually be a positive number (not just truthy), and
    // currency (defaulting to NGN like the rest of this handler
    // already does) must at least look like a real 3-letter code.
    // Malformed requests now get a specific 400 instead of falling
    // through to a provider API call that fails confusingly.
    assertValidAmount(amount);
    const resolvedCurrency = currency || 'NGN';
    assertValidCurrencyFormat(resolvedCurrency);

    // Smart Routing: Determine provider from action OR explicit provider field
    let providerName = provider;
    if (!providerName && action) {
      providerName = ROUTING_RULES[action] || 'paystack';
    }
    if (!providerName) {
      providerName = 'paystack'; // Default fallback
    }

    log(`Routing to provider: '${providerName}'`);

    // Task 10 (Korapay-focus partial): reject a currency the resolved
    // provider is confirmed NOT to support, instead of forwarding it
    // and letting the provider API fail with a confusing error (or, in
    // the worst case, silently accepting a currency the provider
    // doesn't actually process correctly). See assertCurrencySupported
    // above for exactly which providers this currently covers.
    assertCurrencySupported(providerName, resolvedCurrency);

    // Task 11: customer.email is required (and must look like an
    // email) for providers whose processPayment() forwards it with no
    // fallback default — see utils/helpers.js's PROVIDERS_REQUIRING_EMAIL
    // note for exactly which providers and why Payscribe is excluded.
    assertValidCustomerEmail(providerName, customer);

    const providerInstance = getProvider(providerName);
    
    const ref = reference || generateReference(providerName);
    
    const paymentData = {
      amount,
      currency: resolvedCurrency,
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
    // Respects error.statusCode when the error carries one (e.g. the
    // 400 from assertCurrencySupported above, Task 10) instead of
    // always answering 500 — same pattern already used by the
    // /webhooks/:provider route below (Task 3).
    return res.status(error.statusCode || 500).json({
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
// Paystack (Task 3), Korapay (Task 4), Juicyway (Task 5): real
// signature/checksum verification, 401 on mismatch. Payscribe (Task 6):
// still a routing-skeleton stub from Task 2 — always ack 200, nothing
// to reject on yet.
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

    return res.status(200).json({ status: true, message: 'Webhook received' });

  } catch (error) {
    log(`Webhook Error: ${error.message}`, 'error');
    return res.status(error.statusCode || 500).json({ status: false, message: error.message || 'Webhook processing failed' });
  }
});

export default router;