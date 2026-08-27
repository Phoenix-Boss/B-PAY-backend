import fetch from 'node-fetch';
import { log, handleApiCall, getProviderKey, generateReference, formatPayload, getProviderBaseUrl, providerError } from '../utils/helpers.js';

export class Payscribe {
  constructor() {
    this.secretKey = getProviderKey('payscribe', 'secret');
    this.baseUrl = getProviderBaseUrl('payscribe');
    log(`Payscribe provider initialized (${process.env.NODE_ENV || 'development'} mode)`);
  }

  async processPayment(data) {
    const ref = data.reference || generateReference('payscribe');

    const payload = {
      account_type: 'dynamic',
      ref: ref,
      currency: data.currency,
      order: {
        amount: data.amount,
        amount_type: 'EXACT',
        description: `Payment for ${ref}`,
        expiry: {
          duration: 24,
          duration_type: 'hours'
        }
      },
      customer: {
        name: data.customer?.name || 'Customer',
        email: data.customer?.email || 'customer@example.com',
        phone: data.customer?.phone || '08000000000'
      }
    };

    log(`Payscribe Payment Request: ${formatPayload(payload)}`);

    const result = await handleApiCall(async () => {
      const response = await fetch(`${this.baseUrl}/collections/virtual-accounts/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.secretKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok || !responseData.status) {
        // Task 13: Payscribe returns its failure reason in `.description`
        // rather than `.message` (see the success-path parsing above) —
        // still a provider-authored, user-facing string either way.
        throw providerError(responseData.description || 'Payscribe payment initiation failed');
      }

      return responseData;
    }, 'payscribe');

    log(`Payscribe Payment Response: ${formatPayload(result)}`);
    return result;
  }

  async verifyTransaction(reference) {
    log(`Payscribe Verification Request for: ${reference}`);
    throw new Error('Payscribe verification requires Webhook or Bank Session ID. Please check Webhooks.');
  }
}