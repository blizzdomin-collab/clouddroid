import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

export async function getCached<T>(key: string, fetcher: () => Promise<T>, ttlSeconds = 60): Promise<T> {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached) as T;
  }

  const data = await fetcher();
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
  return data;
}

export async function invalidateCache(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}

export async function setCache(key: string, data: any, ttlSeconds = 60) {
  await redis.setex(key, ttlSeconds, JSON.stringify(data));
}
