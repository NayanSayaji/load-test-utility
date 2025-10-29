/**
 * Rate Limiter Utility
 * 
 * This module provides rate limiting functionality for controlling
 * the number of requests per second (RPS) in load testing.
 */

/**
 * Rate limiter class for controlling request frequency
 * 
 * @class RateLimiter
 * @description Controls the rate of requests to maintain a specific RPS
 */
export class RateLimiter {
    private requestsPerSecond: number;
    private intervalMs: number;
    private lastRequestTime: number = 0;
    private requestQueue: Array<() => void> = [];
    private isProcessing: boolean = false;

    /**
     * Create a new rate limiter
     * 
     * @param requestsPerSecond - Target requests per second
     */
    constructor(requestsPerSecond: number) {
        this.requestsPerSecond = requestsPerSecond;
        this.intervalMs = 1000 / requestsPerSecond; // Time between requests in ms
    }

    /**
     * Wait for the next available slot based on rate limit
     * 
     * @returns Promise that resolves when it's safe to make a request
     */
    async waitForSlot(): Promise<void> {
        return new Promise((resolve) => {
            this.requestQueue.push(resolve);
            this.processQueue();
        });
    }

    /**
     * Process the request queue to maintain rate limiting
     */
    private async processQueue(): Promise<void> {
        if (this.isProcessing || this.requestQueue.length === 0) {
            return;
        }

        this.isProcessing = true;

        while (this.requestQueue.length > 0) {
            const now = Date.now();
            const timeSinceLastRequest = now - this.lastRequestTime;

            if (timeSinceLastRequest >= this.intervalMs) {
                // It's safe to make a request
                const resolve = this.requestQueue.shift();
                if (resolve) {
                    this.lastRequestTime = now;
                    resolve();
                }
            } else {
                // Need to wait before next request
                const waitTime = this.intervalMs - timeSinceLastRequest;
                await this.sleep(waitTime);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Sleep for a specified number of milliseconds
     * 
     * @param ms - Milliseconds to sleep
     */
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Get the current requests per second setting
     * 
     * @returns Current RPS setting
     */
    getRPS(): number {
        return this.requestsPerSecond;
    }

    /**
     * Update the requests per second setting
     * 
     * @param requestsPerSecond - New RPS setting
     */
    setRPS(requestsPerSecond: number): void {
        this.requestsPerSecond = requestsPerSecond;
        this.intervalMs = 1000 / requestsPerSecond;
    }

    /**
     * Get the interval between requests in milliseconds
     * 
     * @returns Interval in milliseconds
     */
    getIntervalMs(): number {
        return this.intervalMs;
    }
}

/**
 * Create a rate limiter instance
 * 
 * @param requestsPerSecond - Target requests per second
 * @returns RateLimiter instance
 */
export function createRateLimiter(requestsPerSecond: number): RateLimiter {
    return new RateLimiter(requestsPerSecond);
}
