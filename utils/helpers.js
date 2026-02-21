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