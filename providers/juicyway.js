import fetch from 'node-fetch';
import crypto from 'crypto';
import { log, handleApiCall, getProviderKey, generateReference, formatPayload, getProviderBaseUrl } from '../utils/helpers.js';

export class Juicyway {
  constructor() {
    this.apiKey = getProviderKey('juicyway', 'secret');
    this.baseUrl = getProviderBaseUrl('juicyway');
    // Juicyway's webhook checksum is NOT keyed with the API key --
    // per docs.juicyway.com/webhooks, the HMAC key is the merchant's
    // "business ID" (a separate credential from the JuicyWay
    // dashboard), not JUICYWAY_API_KEY/JUICYWAY_PUBLIC_KEY.
    // getProviderKey() has no entry for this since it doesn't fit the
    // existing public/secret pattern, so it's read directly here.
    this.businessId = process.env.JUICYWAY_BUSINESS_ID || '';
    log(`Juicyway provider initialized (${process.env.NODE_ENV || 'development'} mode)`);
  }

  async processPayment(data) {
    const ref = data.reference || generateReference('juicyway');

    const payload = {
      amount: data.amount,
      email: data.customer?.email,
      reference: ref,
      currency: data.currency,
    };

    log(`Juicyway Payment Request: ${formatPayload(payload)}`);

    const result = await handleApiCall(async () => {
      // ⚠️ Verify exact endpoint path in Juicyway docs
      const response = await fetch(`${this.baseUrl}/v1/charges`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Juicyway payment failed');
      }

      return responseData;
    }, 'juicyway');

    log(`Juicyway Payment Response: ${formatPayload(result)}`);
    return result;
  }

  async verifyTransaction(reference) {
    log(`Juicyway Verification Request for: ${reference}`);

    const result = await handleApiCall(async () => {
      const response = await fetch(`${this.baseUrl}/v1/charges/${reference}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Juicyway verification failed');
      }

      return responseData;
    }, 'juicyway');

    log(`Juicyway Verification Response: ${formatPayload(result)}`);
    return result;
  }

  // ==================================================
  // 🔔 WEBHOOK SIGNATURE VERIFICATION
  // ==================================================
  // Confirmed directly against docs.juicyway.com/webhooks.md
  // (2026-08-27 session; nothing about this scheme was known before
  // this task). Materially different from both Paystack's and
  // Korapay's schemes:
  // - There is NO signature HTTP header at all. The checksum travels
  //   INSIDE the JSON body as a `checksum` field alongside `event`
  //   and `data` -- so this method takes the whole parsed body, not a
  //   header value.
  // - The HMAC key is the merchant's "business ID", not the secret
  //   API key used for REST calls (see constructor comment above).
  // - The signed string is `${event}|${json_encoded_data}`, where
  //   `data` must be JSON-encoded with keys in alphabetical order --
  //   the docs explicitly warn "the encoded data must exclude the
  //   checksum field and be in alphabetical order" and show a nested
  //   example (customer/merchant/etc. sub-objects) that is itself
  //   alphabetized at every level. Plain JSON.stringify() preserves
  //   insertion order, not alphabetical order -- a naive
  //   JSON.stringify(data) (which is literally what Juicyway's own
  //   Node.js doc example does, despite importing
  //   `json-stable-stringify` and never calling it -- an apparent bug
  //   in their own sample) would silently produce the wrong hash for
  //   any payload whose keys weren't already alphabetized by the
  //   sender. stableStringify() below sorts keys recursively to match
  //   the documented (not the buggy sample) behavior.
  // - The digest is hex, uppercase: the docs' own sample checksum
  //   ("32762AE880695AE7343A649CB9C36CA6FF83AA258A139804AEF7D73B421DE097")
  //   is uppercase hex, and the Python/Node examples both explicitly
  //   uppercase their digest. The PHP example lowercases both sides
  //   before comparing instead -- an inconsistency across Juicyway's
  //   own language examples -- but uppercase is the more consistent
  //   signal (two of three examples, plus the sample value itself),
  //   so that's what's implemented here. Uppercasing the incoming
  //   checksum too before comparing makes this tolerant of either
  //   case regardless.
  // - Only one documented event pair exists so far:
  //   payment.session.succeeded / payment.session.failed. The docs
  //   also note: "In sandbox, successful transactions remain pending.
  //   Only failure events are sent" -- worth remembering for Task 14's
  //   manual test pass, since a sandbox test can't exercise the
  //   success path via a real webhook this way.
  verifyWebhookSignature(payload) {
    if (!payload || typeof payload !== 'object') return false;
    const { checksum, event, data } = payload;
    if (!checksum || !event) return false;

    const message = `${event}|${stableStringify(data)}`;
    const expected = crypto
      .createHmac('sha256', this.businessId)
      .update(message)
      .digest('hex')
      .toUpperCase();

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const checksumBuffer = Buffer.from(String(checksum).toUpperCase(), 'utf8');
    if (expectedBuffer.length !== checksumBuffer.length) return false;
    return crypto.timingSafeEqual(expectedBuffer, checksumBuffer);
  }
}

// Recursively serializes a value with object keys in alphabetical
// order at every nesting level. This is specific to matching
// Juicyway's documented webhook checksum encoding (see
// verifyWebhookSignature above) -- not a general-purpose utility, so
// it's kept local to this file rather than added to utils/helpers.js.
function stableStringify(value) {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  const entries = keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`);
  return `{${entries.join(',')}}`;
}