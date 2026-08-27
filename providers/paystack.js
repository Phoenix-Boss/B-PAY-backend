import fetch from 'node-fetch';
import crypto from 'crypto';
import { log, handleApiCall, getProviderKey, generateReference, formatPayload, getProviderBaseUrl, convertAmountForProvider } from '../utils/helpers.js';

export class Paystack {
  constructor() {
    this.secretKey = getProviderKey('paystack', 'secret');
    this.baseUrl = getProviderBaseUrl('paystack');
    log('Paystack provider initialized');
  }

  async processPayment(data) {
    const ref = data.reference || generateReference('paystack');
    // Was: toSubUnit(data.amount, data.currency) — now routed through
    // the per-provider helper (Task 9, partial) so this call site
    // doesn't have to know Paystack-specific unit rules itself.
    const amountInKobo = convertAmountForProvider(data.amount, 'paystack', data.currency);

    const payload = {
      email: data.customer?.email,
      amount: amountInKobo,
      currency: data.currency,
      reference: ref,
    };

    log(`Paystack Payment Request: ${formatPayload(payload)}`);

    const result = await handleApiCall(async () => {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.status) {
        throw new Error(responseData.message || 'Paystack initialization failed');
      }

      return responseData;
    }, 'paystack');

    log(`Paystack Payment Response: ${formatPayload(result)}`);
    return result;
  }

  async verifyTransaction(reference) {
    log(`Paystack Verification Request for: ${reference}`);

    const result = await handleApiCall(async () => {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const responseData = await response.json();

      if (!response.ok || !responseData.status) {
        throw new Error(responseData.message || 'Paystack verification failed');
      }

      return responseData;
    }, 'paystack');

    log(`Paystack Verification Response: ${formatPayload(result)}`);
    return result;
  }

  // ==================================================
  // 🔔 WEBHOOK SIGNATURE VERIFICATION
  // ==================================================
  // Confirmed directly against paystack.com/docs/payments/webhooks/
  // (2026-08-27 session): the `x-paystack-signature` header is a
  // hex-encoded HMAC-SHA512 of the event payload, keyed with the
  // Paystack secret key. Paystack's own official Node example hashes
  // `JSON.stringify(req.body)` — the body **after** Express's
  // `express.json()` has parsed and re-serialized it — not the raw
  // request bytes. That's a real fragility (re-serialization can
  // diverge from the original bytes for edge cases like key
  // ordering or unicode escaping — several third-party guides flag
  // exactly this), but it's what Paystack's own docs demonstrate, so
  // this method follows the primary source exactly rather than
  // switching to `req.rawBody`. Task 2's raw-body concern turned out
  // to be unnecessary for Paystack specifically once confirmed
  // directly — no `express.json({ verify })` change was needed here.
  // If signature mismatches ever show up in practice, that
  // re-serialization edge case is the first thing to check.
  verifyWebhookSignature(body, signature) {
    if (!signature) return false;
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(JSON.stringify(body))
      .digest('hex');
    // Constant-time compare where possible (falls back to false on
    // length mismatch, which crypto.timingSafeEqual requires anyway).
    const hashBuffer = Buffer.from(hash, 'utf8');
    const sigBuffer = Buffer.from(signature, 'utf8');
    if (hashBuffer.length !== sigBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, sigBuffer);
  }
}