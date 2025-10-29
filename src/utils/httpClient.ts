/**
 * HTTP Client Utility
 * Handles HTTP requests for load testing using Axios
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { RequestResult, HttpRequestOptions } from '../types/load.types';
import { RateLimiter } from './rateLimiter';

export class HttpClient {
    /**
     * Send a single HTTP request and measure its performance
     */
    static async sendRequest(
        url: string,
        options: HttpRequestOptions,
        reqNo: number,
        configId: string = 'default',
        responseOptions?: {
            storeResponseBody?: boolean;
            storeResponseHeaders?: boolean;
            maxResponseBodySize?: number;
            truncateLargeResponses?: boolean;
        }
    ): Promise<RequestResult> {
        const start = Date.now();

        try {
            const axiosConfig: AxiosRequestConfig = {
                method: options.method as any,
                url,
                headers: options.headers,
                data: options.body,
                timeout: 30000, // 30 second timeout
                validateStatus: () => true // Don't throw on HTTP error status codes
            };

            const response: AxiosResponse = await axios(axiosConfig);

            const timeTaken = Date.now() - start;
            const status = response.status;
            const success = status >= 200 && status < 300;

            // Extract response data
            const responseSize = response.data ? JSON.stringify(response.data).length : 0;
            let responseBody: string | undefined;
            let responseHeaders: Record<string, string> | undefined;
            let responseTruncated = false;

            // Store response body if enabled
            if (responseOptions?.storeResponseBody) {
                const maxSize = responseOptions.maxResponseBodySize || 10000; // Default 10KB
                const bodyStr = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

                if (bodyStr.length > maxSize && responseOptions.truncateLargeResponses) {
                    responseBody = bodyStr.substring(0, maxSize) + '... [TRUNCATED]';
                    responseTruncated = true;
                } else {
                    responseBody = bodyStr;
                }
            }

            // Store response headers if enabled
            if (responseOptions?.storeResponseHeaders) {
                responseHeaders = response.headers as Record<string, string>;
            }

            return {
                reqNo,
                configId,
                status,
                success,
                timeTakenMs: timeTaken,
                timestamp: new Date().toISOString(),
                responseSize,
                responseBody,
                responseHeaders,
                responseTruncated
            };
        } catch (error: any) {
            const timeTaken = Date.now() - start;
            let errorMessage = 'Unknown error';
            let status: number | 'ERROR' = 'ERROR';

            if (error.response) {
                // Server responded with error status
                status = error.response.status;
                errorMessage = `HTTP ${status}: ${error.response.statusText}`;
            } else if (error.request) {
                // Request was made but no response received
                errorMessage = 'No response received';
            } else {
                // Something else happened
                errorMessage = error.message || 'Request setup error';
            }

            return {
                reqNo,
                configId,
                status,
                success: false,
                timeTakenMs: timeTaken,
                error: JSON.stringify(error),
                timestamp: new Date().toISOString(),
                responseSize: 0,
                responseBody: undefined,
                responseHeaders: undefined,
                responseTruncated: false
            };
        }
    }

    /**
     * Send multiple requests with concurrency control
     */
    static async sendConcurrentRequests(
        url: string,
        options: HttpRequestOptions,
        totalRequests: number,
        concurrency: number,
        configId: string = 'default',
        responseOptions?: {
            storeResponseBody?: boolean;
            storeResponseHeaders?: boolean;
            maxResponseBodySize?: number;
            truncateLargeResponses?: boolean;
        },
        rateLimiter?: RateLimiter
    ): Promise<RequestResult[]> {
        const results: RequestResult[] = [];
        let current = 0;
        const active = new Set<Promise<void>>();

        while (current < totalRequests) {
            // Start new requests up to concurrency limit
            while (active.size < concurrency && current < totalRequests) {
                const reqNo = ++current;

                // Wait for rate limiter if specified
                if (rateLimiter) {
                    await rateLimiter.waitForSlot();
                }

                const promise = this.sendRequest(url, options, reqNo, configId, responseOptions)
                    .then(result => {
                        results.push(result);
                        active.delete(promise);
                    });
                active.add(promise);
            }

            // Wait for at least one request to complete
            await Promise.race(active);
        }

        // Wait for all remaining requests to complete
        await Promise.all(active);

        return results;
    }
}
