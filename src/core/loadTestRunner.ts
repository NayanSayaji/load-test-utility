/**
 * Load Test Runner
 * Orchestrates the load testing process with concurrency control
 */

import { HttpClient } from '../utils/httpClient';
import { ResultAnalyzer } from '../utils/resultAnalyzer';
import { LoadTestConfig, RequestResult, LoadTestSummary } from '../types/load.types';

export class LoadTestRunner {
    private config: LoadTestConfig;

    constructor(config: LoadTestConfig) {
        this.config = config;
    }

    /**
     * Run the complete load test
     */
    async run(): Promise<LoadTestSummary> {
        console.log(`🚀 Starting load test with ${this.config.totalRequests} requests (concurrency: ${this.config.concurrency})`);
        console.log(`📡 Target URL: ${this.config.url}`);
        console.log(`⏱️  Method: ${this.config.method || 'GET'}`);
        console.log('');

        const startTime = Date.now();

        try {
            // Execute load test
            const results = await HttpClient.sendConcurrentRequests(
                this.config.url,
                {
                    method: this.config.method || 'GET',
                    headers: this.config.headers,
                },
                this.config.totalRequests,
                this.config.concurrency
            );

            const totalTime = Date.now() - startTime;

            // Analyze results
            const summary = ResultAnalyzer.analyzeResults(results, totalTime);

            // Add execution time to summary
            const enhancedSummary = {
                ...summary,
                totalExecutionTimeMs: totalTime,
                requestsPerSecond: (this.config.totalRequests / (totalTime / 1000)).toFixed(2)
            };

            // Display results
            // ResultAnalyzer.printSummary(enhancedSummary);

            // Save results
            ResultAnalyzer.saveResults(enhancedSummary, 'results.json');
            ResultAnalyzer.saveResultsAsCSV(results, 'results.csv');

            console.log(`🎯 Load test completed in ${(totalTime / 1000).toFixed(2)} seconds`);
            console.log(`📈 Throughput: ${enhancedSummary.requestsPerSecond} requests/second`);

            return enhancedSummary;
        } catch (error) {
            console.error('❌ Load test failed:', error);
            throw error;
        }
    }

    /**
     * Run load test with progress updates
     */
    async runWithProgress(): Promise<LoadTestSummary> {
        console.log(`🚀 Starting load test with ${this.config.totalRequests} requests (concurrency: ${this.config.concurrency})`);
        console.log(`📡 Target URL: ${this.config.url}`);
        console.log('');

        const results: RequestResult[] = [];
        let completed = 0;
        const startTime = Date.now();

        // Progress tracking
        const progressInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = completed / elapsed;
            console.log(`📊 Progress: ${completed}/${this.config.totalRequests} (${((completed / this.config.totalRequests) * 100).toFixed(1)}%) - ${rate.toFixed(1)} req/s`);
        }, 2000);

        try {
            // Execute requests with progress tracking
            const promises: Promise<void>[] = [];
            let current = 0;
            const active = new Set<Promise<void>>();

            while (current < this.config.totalRequests) {
                while (active.size < this.config.concurrency && current < this.config.totalRequests) {
                    const reqNo = ++current;
                    const promise = HttpClient.sendRequest(
                        this.config.url,
                        {
                            method: this.config.method || 'GET',
                            headers: this.config.headers,
                        },
                        reqNo
                    ).then((result: RequestResult) => {
                        results.push(result);
                        completed++;
                        active.delete(promise);
                    });
                    active.add(promise);
                }
                await Promise.race(active);
            }

            await Promise.all(active);
            clearInterval(progressInterval);

            const totalTime = Date.now() - startTime;
            const summary = ResultAnalyzer.analyzeResults(results, totalTime);

            const enhancedSummary = {
                ...summary,
                totalExecutionTimeMs: totalTime,
                requestsPerSecond: (this.config.totalRequests / (totalTime / 1000)).toFixed(2)
            };

            ResultAnalyzer.printSummary(enhancedSummary);
            ResultAnalyzer.saveResults(enhancedSummary, 'results.json');
            ResultAnalyzer.saveResultsAsCSV(results, 'results.csv');

            console.log(`🎯 Load test completed in ${(totalTime / 1000).toFixed(2)} seconds`);
            console.log(`📈 Throughput: ${enhancedSummary.requestsPerSecond} requests/second`);

            return enhancedSummary;
        } catch (error) {
            clearInterval(progressInterval);
            console.error('❌ Load test failed:', error);
            throw error;
        }
    }
}
