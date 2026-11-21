export type RateLimiterOptions = { limit: number; windowMs: number };

export function createRateLimiter({ limit, windowMs }: RateLimiterOptions): (nowMs: number) => boolean {
  let acceptedAt: number[] = [];
  return (nowMs) => {
    acceptedAt = acceptedAt.filter((timestamp) => nowMs - timestamp < windowMs);
    if (acceptedAt.length >= limit) return false;
    acceptedAt = [...acceptedAt, nowMs];
    return true;
  };
}

export function isSameOriginRequest(headers: Headers): boolean {
  const origin = headers.get("origin");
  const host = headers.get("host");
  if (!origin || !host || !URL.canParse(origin)) return false;
  return new URL(origin).host === host;
}
