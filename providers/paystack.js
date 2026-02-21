import fetch from 'node-fetch';
import { log, handleApiCall, getProviderKey, generateReference, formatPayload, getProviderBaseUrl, toSubUnit } from '../utils/helpers.js';

export class Paystack {
  constructor() {
    this.secretKey = getProviderKey('paystack', 'secret');
    this.baseUrl = getProviderBaseUrl('paystack');
    log('Paystack provider initialized');
  }

  async processPayment(data) {
    const ref = data.reference || generateReference('paystack');
    const amountInKobo = toSubUnit(data.amount, data.currency);

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
}