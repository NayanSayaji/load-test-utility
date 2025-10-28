/**
 * HTTP Client Utility
 * Handles HTTP requests for load testing using Axios
 */

import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { RequestResult, HttpRequestOptions } from '../types/load.types';

export class HttpClient {
    /**
     * Send a single HTTP request and measure its performance
     */
    static async sendRequest(
        url: string,
        options: HttpRequestOptions,
        reqNo: number,
        configId: string = 'default'
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

            return {
                reqNo,
                configId,
                status,
                success,
                timeTakenMs: timeTaken,
                timestamp: new Date().toISOString(),
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
                error: errorMessage,
                timestamp: new Date().toISOString(),
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
        configId: string = 'default'
    ): Promise<RequestResult[]> {
        const results: RequestResult[] = [];
        let current = 0;
        const active = new Set<Promise<void>>();

        while (current < totalRequests) {
            // Start new requests up to concurrency limit
            while (active.size < concurrency && current < totalRequests) {
                const reqNo = ++current;
                const promise = this.sendRequest(url, options, reqNo, configId)
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
