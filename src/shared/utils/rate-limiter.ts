
interface RateLimiterOptions {
  maxRequests: number;
  perMinute: number;
}

export class RateLimiter {
  private requests: number = 0;
  private lastReset: number = Date.now();
  private readonly maxRequests: number;
  private readonly resetInterval: number;

  constructor(options: RateLimiterOptions) {
    this.maxRequests = options.maxRequests;
    this.resetInterval = (options.perMinute * 60 * 1000);
  }

  async checkLimit(): Promise<boolean> {
    const now = Date.now();
    if (now - this.lastReset >= this.resetInterval) {
      this.requests = 0;
      this.lastReset = now;
    }

    if (this.requests >= this.maxRequests) {
      return false;
    }

    this.requests++;
    return true;
  }

  async waitForReset(): Promise<void> {
    const now = Date.now();
    const timeUntilReset = this.resetInterval - (now - this.lastReset);
    return new Promise(resolve => setTimeout(resolve, timeUntilReset));
  }
}
