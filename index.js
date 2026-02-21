import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import routes from './routes.js';
import { initializeHelpers, getHealthStatus, log } from './utils/helpers.js';

// ==================================================
// 🚀 EXPRESS APP INITIALIZATION
// ==================================================

const app = express();
const PORT = process.env.PORT || 3000;

// ==================================================
// 🛡️ MIDDLEWARE
// ==================================================

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// JSON Body Parser
app.use(express.json({ limit: '10mb' }));

// Request Logging Middleware
app.use((req, res, next) => {
  log(`📥 ${req.method} ${req.path} from ${req.ip}`);
  next();
});

// ==================================================
// 🛣️ ROUTES
// ==================================================

// API Routes
app.use('/api', routes);

// Health Check Endpoint
app.get('/health', (req, res) => {
  const health = getHealthStatus();
  log(`🏥 Health check requested - Status: ${health.status}`);
  res.json(health);
});

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'B-Pay Backend',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      pay: '/api/pay',
      verify: '/api/verify',
    },
  });
});

// ==================================================
// ❌ ERROR HANDLING
// ==================================================

// 404 Handler
app.use((req, res) => {
  log(`⚠️ 404 - Route not found: ${req.method} ${req.path}`);
  res.status(404).json({
    status: false,
    message: 'Endpoint not found',
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  log(`❌ Global Error: ${err.message}`, 'error');
  res.status(err.status || 500).json({
    status: false,
    message: err.message || 'Internal server error',
  });
});

// ==================================================
// 🎯 SERVER STARTUP
// ==================================================

// Initialize helpers
initializeHelpers();

// Start Server
app.listen(PORT, () => {
  log(`✅ B-Pay Backend is running`, 'info');
  log(`🌍 Port: ${PORT}`, 'info');
  log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`, 'info');
  log(`📡 Health Check: http://localhost:${PORT}/health`, 'info');
});

// ==================================================
// 🛑 GRACEFUL SHUTDOWN
// ==================================================

process.on('SIGTERM', () => {
  log('🛑 SIGTERM received. Shutting down gracefully...', 'warn');
  process.exit(0);
});

process.on('SIGINT', () => {
  log('🛑 SIGINT received. Shutting down gracefully...', 'warn');
  process.exit(0);
});

export default app;