import { Queue, Worker } from 'bullmq';
import { processInterviewTurn } from '../services/interviewProcessor.js';
import Net from 'net';

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = parseInt(process.env.REDIS_PORT || '6379');

/**
 * Helper to check if Redis port is open before BullMQ tries to connect.
 * This prevents the aggressive connection retry noise in dev environments without Redis.
 */
const checkRedis = (host, port) => {
  return new Promise((resolve) => {
    const socket = new Net.Socket();
    socket.setTimeout(1000);
    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host, () => {
      socket.end();
      resolve(true);
    });
  });
};

let queue = null;
let worker = null;

const initQueue = async () => {
  const isRedisUp = await checkRedis(redisHost, redisPort);
  
  if (!isRedisUp) {
    console.warn(`⚠️ Redis not detected at ${redisHost}:${redisPort}. Background tasks disabled (using sync fallback).`);
    return;
  }

  try {
    const connection = { host: redisHost, port: redisPort, maxRetriesPerRequest: null };
    
    queue = new Queue('gemini-processing', { connection });
    worker = new Worker('gemini-processing', async (job) => {
      const { sessionId, userMessage } = job.data;
      await processInterviewTurn(sessionId, userMessage);
    }, { connection });

    queue.on('error', (err) => console.error('BullMQ Queue Error:', err.message));
    worker.on('error', (err) => console.error('BullMQ Worker Error:', err.message));
    console.log('✅ BullMQ (Redis) connected');
  } catch (e) {
    console.warn('❌ BullMQ Initialization failed:', e.message);
  }
};

// Start initialization (async)
initQueue();

export const geminiQueue = new Proxy({}, {
  get(target, prop) {
    if (prop === 'client') return queue?.client;
    if (prop === 'add') return queue ? queue.add.bind(queue) : undefined;
    return queue?.[prop];
  }
});

export const geminiWorker = worker;
