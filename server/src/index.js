import './config.js'; // MUST BE FIRST
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import { ClerkExpressWithAuth } from '@clerk/clerk-sdk-node';
import interviewRoutes from './routes/interviewRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

console.log('--- Auth Config Check ---');
console.log('CLERK_PUBLISHABLE_KEY present:', !!process.env.CLERK_PUBLISHABLE_KEY);
console.log('CLERK_SECRET_KEY present:', !!process.env.CLERK_SECRET_KEY);
if (process.env.CLERK_SECRET_KEY) {
    console.log('CLERK_SECRET_KEY starts with:', process.env.CLERK_SECRET_KEY.substring(0, 8));
}
console.log('-------------------------');

// Custom Debug Middleware
app.use((req, res, next) => {
  console.log(`\n--- Incoming Request: ${req.method} ${req.url} ---`);
  next();
});

// Clerk Auth Middleware (DISABLED TEMPORARILY FOR DEBUGGING)
/*
app.use('/api/interview', (req, res, next) => {
  ClerkExpressWithAuth({
    secretKey: process.env.CLERK_SECRET_KEY,
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  })(req, res, (err) => {
    if (err) {
      console.error('[AUTH ERROR] Clerk middleware threw an error:', err);
    }
    console.log('[AUTH] Middleware finished. userId:', req.auth?.userId || 'NOT FOUND');
    next();
  });
});
*/

app.use('/api/interview', (req, res, next) => {
    console.log('[DEBUG] Bypassing Clerk for testing...');
    next();
});

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
  serverSelectionTimeoutMS: 30000, // Increased to 30s
  connectTimeoutMS: 30000
})
  .then(() => console.log('✅ Connected to MongoDB Atlas'))
  .catch((err) => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1); // Exit if DB connection fails
  });

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
