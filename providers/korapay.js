import fetch from 'node-fetch';
import crypto from 'crypto';
import { log, handleApiCall, getProviderKey, generateReference, formatPayload, getProviderBaseUrl, convertAmountForProvider, providerError } from '../utils/helpers.js';

export class Korapay {
  constructor() {
    this.secretKey = getProviderKey('korapay', 'secret');
    this.baseUrl = getProviderBaseUrl('korapay');
    log('Korapay provider initialized');
  }

  async processPayment(data) {
    const ref = data.reference || generateReference('korapay');
    // Confirmed (Task 7) Korapay wants base currency units, not
    // subunits — convertAmountForProvider is a confirmed no-op here,
    // but routing through it (Task 9, partial) makes that rule
    // explicit and enforced in code rather than only documented in a
    // comment, and keeps this call site consistent with Paystack's.
    const amount = convertAmountForProvider(data.amount, 'korapay', data.currency);

    // Korapay's initialize-charge endpoint requires the payer's details
    // nested under a `customer` object -- a flat top-level `email` field
    // is rejected. See https://developers.korapay.com/docs/checkout-redirect
    const payload = {
      amount,
      currency: data.currency,
      reference: ref,
      customer: {
        email: data.customer?.email,
        name: data.customer?.name,
      },
    };

    log(`Korapay Payment Request: ${formatPayload(payload)}`);

    const result = await handleApiCall(async () => {
      // Real endpoint per Korapay's docs is
      // {baseUrl}/api/v1/charges/initialize -- this was previously
      // /transactions/charge, which doesn't exist on Korapay's API.
      const response = await fetch(`${this.baseUrl}/api/v1/charges/initialize`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.status) {
        throw providerError(responseData.message || 'Korapay payment failed');
      }

      return responseData;
    }, 'korapay');

    log(`Korapay Payment Response: ${formatPayload(result)}`);
    return result;
  }

  async verifyTransaction(reference) {
    log(`Korapay Verification Request for: ${reference}`);

    const result = await handleApiCall(async () => {
      // Real endpoint per Korapay's docs is
      // {baseUrl}/api/v1/charges/:reference (GET, path param) -- this
      // was previously /transactions/verify?reference=, which doesn't
      // exist on Korapay's API.
      const response = await fetch(
        `${this.baseUrl}/api/v1/charges/${encodeURIComponent(reference)}`,
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
        throw providerError(responseData.message || 'Korapay verification failed');
      }

      return responseData;
    }, 'korapay');

    log(`Korapay Verification Response: ${formatPayload(result)}`);
    return result;
  }

  // ==================================================
  // 🔔 WEBHOOK SIGNATURE VERIFICATION
  // ==================================================
  // Confirmed directly against developers.korapay.com/docs/webhooks
  // (2026-08-27 session). Important difference from Paystack: the
  // `x-korapay-signature` header is a hex-encoded HMAC-SHA256 of
  // ONLY the `data` object from the payload — NOT the full body like
  // Paystack. Korapay's own official example hashes
  // `JSON.stringify(req.body.data)`, so this method takes the full
  // parsed body and hashes just its `.data` field, matching that
  // exactly. Like Paystack, this is over the express.json()-parsed-
  // and-re-serialized body, not raw bytes — Korapay's own official
  // examples (Node and PHP alike) do the same re-serialization, so
  // Task 2's raw-body concern doesn't apply here either.
  verifyWebhookSignature(body, signature) {
    if (!signature) return false;
    const hash = crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(body?.data))
      .digest('hex');
    const hashBuffer = Buffer.from(hash, 'utf8');
    const sigBuffer = Buffer.from(signature, 'utf8');
    if (hashBuffer.length !== sigBuffer.length) return false;
    return crypto.timingSafeEqual(hashBuffer, sigBuffer);
  }
}