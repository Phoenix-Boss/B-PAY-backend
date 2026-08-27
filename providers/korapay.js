import fetch from 'node-fetch';
import { log, handleApiCall, getProviderKey, generateReference, formatPayload, getProviderBaseUrl } from '../utils/helpers.js';

export class Korapay {
  constructor() {
    this.secretKey = getProviderKey('korapay', 'secret');
    this.baseUrl = getProviderBaseUrl('korapay');
    log('Korapay provider initialized');
  }

  async processPayment(data) {
    const ref = data.reference || generateReference('korapay');

    // Korapay's initialize-charge endpoint requires the payer's details
    // nested under a `customer` object -- a flat top-level `email` field
    // is rejected. See https://developers.korapay.com/docs/checkout-redirect
    const payload = {
      amount: data.amount,
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
        throw new Error(responseData.message || 'Korapay payment failed');
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
        throw new Error(responseData.message || 'Korapay verification failed');
      }

      return responseData;
    }, 'korapay');

    log(`Korapay Verification Response: ${formatPayload(result)}`);
    return result;
  }
}