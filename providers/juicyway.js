import fetch from 'node-fetch';
import { log, handleApiCall, getProviderKey, generateReference, formatPayload, getProviderBaseUrl } from '../utils/helpers.js';

export class Juicyway {
  constructor() {
    this.apiKey = getProviderKey('juicyway', 'secret');
    this.baseUrl = getProviderBaseUrl('juicyway');
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
}