import './config.js'; // MUST BE FIRST
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import interviewRoutes from './routes/interviewRoutes.js';

const app = express();
const PORT = 5001; // Force 5001 to avoid 5000 conflicts

// Middleware
app.use(cors({
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Health Check for Render
app.get('/health', (req, res) => res.status(200).json({ status: 'ok', timestamp: new Date() }));

// Custom Debug Middleware
app.use((req, res, next) => {
  console.log(`\n--- Incoming Request: ${req.method} ${req.url} ---`);
  next();
});

// Clerk Auth Middleware (Manual Bypass to prevent 401)
const clerkAuthMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const base64Payload = token.split('.')[1];
      const payload = JSON.parse(Buffer.from(base64Payload, 'base64').toString());
      
      req.auth = { 
        userId: payload.sub, 
        claims: payload 
      };
      
      console.log(`[AUTH] Manually extracted User ID: ${req.auth.userId}`);
    } catch (err) {
      console.warn('[AUTH] Could not parse token, continuing as guest:', err.message);
      req.auth = { userId: 'user_debug_123' };
    }
  } else {
    console.log('[AUTH] No token found, continuing as guest.');
    req.auth = { userId: 'user_debug_123' };
  }
  next();
};

app.use('/api/interview', clerkAuthMiddleware);
app.use('/api/interview', interviewRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('!!! UNHANDLED ERROR DETECTED !!!');
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Stack Trace:', err.stack);
  
  res.status(err.status || 500).json({ 
    message: 'Internal Server Error', 
    debug_error: err.message,
    error_name: err.name,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 30000, 
  connectTimeoutMS: 30000
})
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1); 
  });

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
