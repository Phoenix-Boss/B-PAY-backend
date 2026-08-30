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

    // Dynamic Currency Conversion (DCC): only attached when the caller
    // supplies both fields (Korapay requires both together, and both
    // must be currencies Korapay itself supports). `currency` above
    // stays what we're charging in; `payment_currency` is shown to the
    // payer at checkout, `settlement_currency` is what we get paid out
    // in. See https://developers.korapay.com/docs/dynamic-currency-conversion
    if (data.payment_currency && data.settlement_currency) {
      payload.payment_currency = data.payment_currency;
      payload.settlement_currency = data.settlement_currency;
    }

    // Payment method preference (Task 30, Mavins-web companion): only
    // forwarded when the caller supplies `channels` -- an array of
    // Korapay channel strings (bank_transfer, card, pay_with_bank,
    // mobile_money -- confirmed against
    // developers.korapay.com/docs/checkout-redirect's own parameter
    // table). Omitted entirely otherwise, which leaves Korapay's own
    // default channel-selection behavior untouched (same "don't guess,
    // let the provider decide" principle as the currency-validation
    // work in Task 10). `default_channel` only makes sense alongside
    // `channels` per Korapay's own docs ("must also be specified in
    // the channels parameter"), so it's dropped if `channels` wasn't
    // also provided, rather than sent alone and possibly rejected.
    if (Array.isArray(data.channels) && data.channels.length > 0) {
      payload.channels = data.channels;
      if (data.default_channel) {
        payload.default_channel = data.default_channel;
      }
    }

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
  // 💸 PAYOUT / DISBURSEMENT
  // ==================================================
  // Korapay's disburse endpoint for sending money OUT to bank
  // accounts or mobile money wallets. This is the outbound flow
  // (paying listeners, refunds, vendor settlements) vs the inbound
  // collection flow in processPayment() above.
  //
  // Endpoint: POST /api/v1/transactions/disburse
  // Docs: developers.korapay.com/docs/payout-via-api
  //
  // Required fields:
  //   - amount (number): in base currency units (same as collection)
  //   - currency (string): 3-letter code, e.g. 'NGN'
  //   - reference (string): unique transaction reference
  //   - bank_code (string): recipient bank code (from Korapay's bank list)
  //   - account_number (string): recipient account number
  //   - narration (string): description/purpose of the payout
  //
  // Optional fields:
  //   - customer (object): { name, email } — for notification/receipt
  //   - payment_method (string): 'bank_transfer' | 'mobile_money' | etc.
  //
  // The "tag" from Nova Bank maps directly to account_number here.
  // Nova Bank is a virtual-account provider; their "tag" IS the
  // account number Korapay's disburse endpoint expects. No separate
  // Nova Bank API call is needed — Korapay handles the full rail.
  async processPayout(data) {
    const ref = data.reference || generateReference('korapay-payout');
    const amount = convertAmountForProvider(data.amount, 'korapay', data.currency);

    // Build core payload — bank_code + account_number are the
    // Korapay-native identifiers for the recipient.
    const payload = {
      amount,
      currency: data.currency,
      reference: ref,
      bank_code: data.bank_code,
      account_number: data.account_number,
      narration: data.narration || 'Payout from Mavins',
    };

    // Optional customer envelope (notifications/receipts)
    if (data.customer?.name || data.customer?.email) {
      payload.customer = {
        name: data.customer.name,
        email: data.customer.email,
      };
    }

    // Optional payment-method hint (Korapay may use this for routing)
    if (data.payment_method) {
      payload.payment_method = data.payment_method;
    }

    log(`Korapay Payout Request: ${formatPayload(payload)}`);

    const result = await handleApiCall(async () => {
      const response = await fetch(`${this.baseUrl}/api/v1/transactions/disburse`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.status) {
        throw providerError(responseData.message || 'Korapay payout failed');
      }

      return responseData;
    }, 'korapay');

    log(`Korapay Payout Response: ${formatPayload(result)}`);
    return result;
  }

  // ==================================================
  // 🏦 BANK LIST (helper for payout recipient setup)
  // ==================================================
  // Returns the list of supported banks with their Korapay codes.
  // Callers use this to map a user's selected bank name → bank_code
  // for processPayout(). Cached in-memory for 1 hour by default.
  async getBanks(currency = 'NGN') {
    log(`Korapay Banks Request for currency: ${currency}`);

    const result = await handleApiCall(async () => {
      const response = await fetch(
        `${this.baseUrl}/api/v1/banks?currency=${encodeURIComponent(currency)}`,
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
        throw providerError(responseData.message || 'Korapay bank list failed');
      }

      return responseData;
    }, 'korapay');

    log(`Korapay Banks Response: ${formatPayload(result)}`);
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