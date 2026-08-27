import 'dotenv/config';

// ==================================================
// 📝 LOGGING UTILITIES
// ==================================================

export function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}]`;
  const levelTag = `[${level.toUpperCase()}]`;
  
  switch (level) {
    case 'error':
      console.error(`${prefix} ${levelTag} ${message}`);
      break;
    case 'warn':
      console.warn(`${prefix} ${levelTag} ${message}`);
      break;
    default:
      console.log(`${prefix} ${levelTag} ${message}`);
  }
}

export function logApiRequest(provider, endpoint, method) {
  log(`📡 ${provider.toUpperCase()} API Request: ${method} ${endpoint}`, 'info');
}

export function logApiResponse(provider, status, success) {
  const emoji = success ? '✅' : '❌';
  log(`${emoji} ${provider.toUpperCase()} API Response: ${status} - ${success ? 'Success' : 'Failed'}`, success ? 'info' : 'error');
}

// ==================================================
// 🔖 REFERENCE GENERATION
// ==================================================

export function generateReference(provider, prefix) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const basePrefix = prefix || provider.toUpperCase();
  return `${basePrefix}-${timestamp}-${random}`;
}

export function isValidReference(reference) {
  return /^[A-Z]+-\d+-[A-Z0-9]+$/.test(reference);
}

// ==================================================
// 🛡️ ERROR HANDLING
// ==================================================

export class ApiError extends Error {
  constructor(provider, statusCode, message, originalError) {
    super(message);
    this.name = 'ApiError';
    this.provider = provider;
    this.statusCode = statusCode;
    this.originalError = originalError;
  }
}

export async function handleApiCall(fn, provider = 'unknown') {
  try {
    log(`🔄 Starting API call for ${provider.toUpperCase()}...`, 'info');
    const result = await fn();
    log(`✅ API call completed for ${provider.toUpperCase()}`, 'info');
    return result;
  } catch (err) {
    const errorMessage = err.message || err.toString();
    log(`❌ API Call Error (${provider.toUpperCase()}): ${errorMessage}`, 'error');
    throw new ApiError(provider, err.statusCode || 500, `API request failed: ${errorMessage}`, err);
  }
}

export function validateApiResponse(response, provider) {
  if (!response) {
    throw new Error(`${provider}: Empty response received`);
  }
  
  const successIndicators = [
    response.status === true,
    response.status === 'true',
    response.success === true,
  ];
  
  if (!successIndicators.some(Boolean) && response.status === false) {
    throw new Error(
      `${provider}: ${response.message || response.description || 'Transaction failed'}`
    );
  }
}

// ==================================================
// 🔑 API KEY MANAGEMENT
// ==================================================

export function getProviderKey(provider, type) {
  const providerLower = provider.toLowerCase();
  
  // ✅ Juicyway uses SINGLE key (supports both JUICYWAY_API_KEY and JUICYWAY_PUBLIC_KEY)
  if (providerLower === 'juicyway') {
    const key = process.env.JUICYWAY_API_KEY || process.env.JUICYWAY_PUBLIC_KEY || '';
    if (!key) {
      throw new Error(`API key not found for ${provider}. Check .env file.`);
    }
    if (key.length < 10) {
      log(`⚠️ Warning: ${provider} key seems too short`, 'warn');
    }
    return key;
  }
  
  // Other providers use public/secret pair
  const keyMap = {
    paystack: {
      public: process.env.PAYSTACK_PUBLIC_KEY || '',
      secret: process.env.PAYSTACK_SECRET_KEY || '',
    },
    payscribe: {
      public: process.env.PAYSCRIBE_PUBLIC_KEY || '',
      secret: process.env.PAYSCRIBE_SECRET_KEY || '',
    },
    korapay: {
      public: process.env.KORAPAY_PUBLIC_KEY || '',
      secret: process.env.KORAPAY_SECRET_KEY || '',
    },
  };

  const providerKeys = keyMap[providerLower];
  
  if (!providerKeys) {
    throw new Error(`Unsupported provider: ${provider}. Supported: paystack, payscribe, korapay, juicyway`);
  }
  
  const key = providerKeys[type];
  
  if (!key) {
    throw new Error(`API key not found for ${provider} (${type}). Check .env file.`);
  }
  
  if (key.length < 10) {
    log(`⚠️ Warning: ${provider} ${type} key seems too short`, 'warn');
  }
  
  return key;
}

export function validateProviderKeys() {
  const providers = ['paystack', 'payscribe', 'juicyway', 'korapay'];
  const missing = [];
  
  providers.forEach(provider => {
    try {
      getProviderKey(provider, 'secret');
    } catch {
      missing.push(provider);
    }
  });
  
  if (missing.length > 0) {
    log(`⚠️ Missing API keys for: ${missing.join(', ')}`, 'warn');
  } else {
    log('✅ All provider API keys are configured', 'info');
  }
}

// ==================================================
// 📦 PAYLOAD UTILITIES
// ==================================================

export function formatPayload(payload, hideSensitive = true) {
  if (!payload) return 'null';
  
  const sanitized = { ...payload };
  
  if (hideSensitive) {
    const sensitiveFields = ['card', 'cvv', 'pin', 'password', 'secret', 'key', 'token'];
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    });
    
    if (sanitized.customer) {
      sanitized.customer = { ...sanitized.customer };
      if (sanitized.customer.phone) {
        sanitized.customer.phone = sanitizePhone(sanitized.customer.phone);
      }
    }
  }
  
  return JSON.stringify(sanitized, null, 2);
}

export function sanitizePhone(phone) {
  if (!phone || phone.length < 4) return '***';
  return '***' + phone.slice(-4);
}

// ==================================================
// 💱 PER-PROVIDER AMOUNT-UNIT HANDLING (Task 9, partial)
// ==================================================
// Replaces the old blanket toSubUnit()/fromSubUnit() call pattern
// (single ×100 assumption applied to whichever provider happened to
// call it) with a per-provider lookup, since amount-unit rules are NOT
// the same across providers — see handover.md's "Confirmed research
// findings" section for the primary-source evidence behind each case
// below. This is a Korapay-focus partial pass on Task 9: only
// Paystack and Korapay have confirmed rules right now. JuicyWay and
// Payscribe are still unconfirmed (Payscribe is also blocked on docs;
// see handover.md), so both throw here rather than silently guessing
// a multiplier — a wrong guess would either overcharge/undercharge by
// 100x or send garbage upstream, so "fail loud" is safer than "fail
// silent" until those two get their own confirmation pass. The
// currency-list-expansion half of Task 9 (pulling the real list from
// Mavins-web) is NOT done here — see handover.md's Task 9 note for
// why that's a separate, still-open piece of work.
export function getAmountFormat(provider, currency) {
  const providerLower = (provider || '').toLowerCase();
  const currencyUpper = (currency || '').toUpperCase();

  switch (providerLower) {
    case 'paystack': {
      // Confirmed: paystack.com/docs/api/ — "multiplying the base
      // amount by 100" for all 5 supported currencies.
      const supported = ['NGN', 'GHS', 'ZAR', 'KES', 'USD'];
      if (!supported.includes(currencyUpper)) {
        log(`⚠️ Paystack: currency ${currencyUpper} is not in the confirmed-supported list (${supported.join(', ')})`, 'warn');
      }
      return { unit: 'subunit', multiplier: 100 };
    }

    case 'korapay': {
      // Confirmed directly (Task 7, 2026-08-27) against
      // developers.korapay.com/docs/checkout-redirect — base currency
      // unit, no multiplier. Currency list per
      // developers.korapay.com/docs/accept-payments +
      // /docs/payout-via-api.
      const supported = ['NGN', 'GHS', 'KES', 'ZAR', 'USD', 'XAF', 'XOF', 'EGP', 'TZS'];
      if (!supported.includes(currencyUpper)) {
        log(`⚠️ Korapay: currency ${currencyUpper} is not in the confirmed-supported list (${supported.join(', ')})`, 'warn');
      }
      return { unit: 'base', multiplier: 1 };
    }

    case 'juicyway':
    case 'payscribe':
      // Not yet confirmed for either provider — see handover.md's
      // "Confirmed research findings" section (Payscribe is also
      // waiting on a docs link; JuicyWay's webhook scheme is
      // confirmed but its amount-unit rule for processPayment was
      // never separately checked). Throw instead of assuming ×100 or
      // ×1 — a silent wrong guess here is a real-money bug, not a
      // cosmetic one.
      throw new Error(
        `getAmountFormat: amount-unit rule for "${provider}" is not yet confirmed — see handover.md Task 9 note before adding one`
      );

    default:
      throw new Error(`getAmountFormat: unsupported provider "${provider}"`);
  }
}

// Convenience wrapper: converts a base-unit input amount into whatever
// unit the given provider actually expects, using getAmountFormat's
// per-provider rule. Provider files should call this instead of the
// old toSubUnit() directly.
export function convertAmountForProvider(amount, provider, currency) {
  const { unit, multiplier } = getAmountFormat(provider, currency);
  return unit === 'subunit' ? Math.round(amount * multiplier) : amount;
}

export function toSubUnit(amount, currency = 'NGN') {
  const subUnitMap = {
    NGN: 100,
    USD: 100,
    GHS: 100,
    KES: 100,
    ZAR: 100,
  };
  
  const multiplier = subUnitMap[currency.toUpperCase()] || 100;
  return Math.round(amount * multiplier);
}

export function fromSubUnit(amount, currency = 'NGN') {
  const subUnitMap = {
    NGN: 100,
    USD: 100,
    GHS: 100,
    KES: 100,
    ZAR: 100,
  };
  
  const divisor = subUnitMap[currency.toUpperCase()] || 100;
  return amount / divisor;
}

// ==================================================
// 🌍 ENVIRONMENT UTILITIES
// ==================================================

export function getEnvironment() {
  return process.env.NODE_ENV || 'development';
}

export function isProduction() {
  return getEnvironment() === 'production';
}

export function getProviderBaseUrl(provider) {
  const env = getEnvironment();
  
  const urlMap = {
    paystack: {
      development: 'https://api.paystack.co',
      production: 'https://api.paystack.co',
    },
    payscribe: {
      development: 'https://sandbox.payscribe.ng/api/v1',
      production: 'https://api.payscribe.ng/api/v1',
    },
    juicyway: {
      development: 'https://api-sandbox.spendjuice.com',
      production: 'https://api.spendjuice.com',
    },
    korapay: {
      development: 'https://api.korapay.com/merchant',
      production: 'https://api.korapay.com/merchant',
    },
  };
  
  const urls = urlMap[provider.toLowerCase()];
  
  if (!urls) {
    throw new Error(`No base URL configured for provider: ${provider}`);
  }
  
  return urls[env] || urls.development;
}

// ==================================================
// ⏱️ UTILITIES
// ==================================================

export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryApiCall(fn, maxRetries = 3, provider = 'unknown') {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      log(`⚠️ Retry ${attempt}/${maxRetries} for ${provider.toUpperCase()}`, 'warn');
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
}

// ==================================================
// 📊 HEALTH CHECK
// ==================================================

export function getHealthStatus() {
  const providers = ['paystack', 'payscribe', 'juicyway', 'korapay'];
  const providerStatus = {};
  
  providers.forEach(provider => {
    try {
      getProviderKey(provider, 'secret');
      providerStatus[provider] = true;
    } catch {
      providerStatus[provider] = false;
    }
  });
  
  return {
    status: 'ok',
    environment: getEnvironment(),
    providers: providerStatus,
    timestamp: new Date().toISOString(),
  };
}

// ==================================================
// 🚀 INITIALIZATION
// ==================================================

export function initializeHelpers() {
  log('🔧 Initializing B-Pay Helpers...', 'info');
  log(`🌍 Environment: ${getEnvironment()}`, 'info');
  validateProviderKeys();
  log('✅ B-Pay Helpers initialized successfully', 'info');
}