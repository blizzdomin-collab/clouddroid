interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= maxAttempts) {
    return false;
  }

  entry.count++;
  return true;
}

export function getRateLimitRemaining(key: string, maxAttempts: number): number {
  const entry = rateLimitMap.get(key);
  if (!entry) return maxAttempts;
  if (Date.now() > entry.resetTime) return maxAttempts;
  return Math.max(0, maxAttempts - entry.count);
}
