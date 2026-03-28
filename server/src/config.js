import dotenv from 'dotenv';
dotenv.config();

// Backward compatibility for Clerk SDK v4
// We trim them to ensure no hidden spaces/newlines from copy-pasting
if (process.env.CLERK_SECRET_KEY) {
  process.env.CLERK_API_KEY = process.env.CLERK_SECRET_KEY.trim();
}

if (process.env.CLERK_PUBLISHABLE_KEY) {
  // Clerk v4 needs the domain part of the publishable key
  // For your key: pk_test_Z2VudGxlLXdhbGxleWUtNC5jbGVyay5hY2NvdW50cy5kZXYk
  // The domain is: gentle-walleye-4.clerk.accounts.dev
  process.env.CLERK_FRONTEND_API = 'gentle-walleye-4.clerk.accounts.dev';
}

console.log('✅ Environment Variables Initialized');
console.log('--- Auth Config Mapping ---');
console.log('CLERK_API_KEY starts with:', process.env.CLERK_API_KEY?.substring(0, 8));
console.log('CLERK_FRONTEND_API:', process.env.CLERK_FRONTEND_API);
