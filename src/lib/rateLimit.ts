import { redis } from './redis';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export async function checkRateLimit(key: string, maxAttempts: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    try {
      await redis.setex(`ratelimit:${key}`, Math.ceil(windowMs / 1000), '1');
    } catch {
      // Redis unavailable, fallback to in-memory
    }
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  try {
    await redis.incr(`ratelimit:${key}`);
  } catch {
    // Redis unavailable, fallback to in-memory
  }
  return true;
}

export async function getRateLimitRemaining(key: string, maxAttempts: number): Promise<number> {
  const entry = rateLimitMap.get(key);
  if (entry) {
    if (Date.now() > entry.resetTime) return maxAttempts;
    return Math.max(0, maxAttempts - entry.count);
  }
  try {
    const count = await redis.get(`ratelimit:${key}`);
    if (!count) return maxAttempts;
    return Math.max(0, maxAttempts - parseInt(count, 10));
  } catch {
    return maxAttempts;
  }
}
