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

export default router;