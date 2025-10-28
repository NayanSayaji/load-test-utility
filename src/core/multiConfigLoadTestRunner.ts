/**
 * Multi-Configuration Load Test Runner
 * 
 * This module orchestrates load testing across multiple configurations using
 * different distribution strategies. It follows SOLID principles by separating
 * concerns and using dependency injection.
 */

import { HttpClient } from '../utils/httpClient';
import { ResultAnalyzer } from '../utils/resultAnalyzer';
import { DistributionStrategyFactory } from '../strategies/distributionStrategy';
import {
    MultiConfigLoadTest,
    LoadTestConfig,
    RequestResult,
    LoadTestSummary,
    LoadTestOptions,
    DistributionPlan
} from '../types/load.types';

/**
 * Multi-configuration load test runner
 * 
 * @class MultiConfigLoadTestRunner
 * @description Orchestrates load testing across multiple configurations
 */
export class MultiConfigLoadTestRunner {
    private multiConfig: MultiConfigLoadTest;
    private options: LoadTestOptions;

    constructor(multiConfig: MultiConfigLoadTest, options: LoadTestOptions = {}) {
        this.multiConfig = multiConfig;
        this.options = {
            showProgress: false,
            progressInterval: 2000,
            saveResults: true,
            outputDir: '.',
            generateCSV: true,
            ...options
        };
    }

    /**
     * Run the complete multi-configuration load test
     * 
     * @returns Comprehensive load test summary
     */
    async run(): Promise<LoadTestSummary> {
        console.log(`🚀 Starting multi-config load test`);
        console.log(`📊 Total Requests: ${this.multiConfig.totalRequests}`);
        console.log(`📈 Configurations: ${this.multiConfig.configs.length}`);
        console.log(`🔄 Distribution Strategy: ${this.multiConfig.distributionStrategy}`);
        console.log('');

        const startTime = Date.now();

        try {
            // Create distribution plan
            const distributionPlan = this.createDistributionPlan();
            this.printDistributionPlan(distributionPlan);

            // Execute load test
            const results = await this.executeLoadTest(distributionPlan);

            const totalTime = Date.now() - startTime;

            // Analyze results
            const summary = ResultAnalyzer.analyzeResults(results, totalTime);

            // Display and save results
            this.handleResults(summary);

            console.log(`🎯 Multi-config load test completed in ${(totalTime / 1000).toFixed(2)} seconds`);

            return summary;
        } catch (error) {
            console.error('❌ Multi-config load test failed:', error);
            throw error;
        }
    }

    /**
     * Run load test with progress updates
     * 
     * @returns Comprehensive load test summary
     */
    async runWithProgress(): Promise<LoadTestSummary> {
        console.log(`🚀 Starting multi-config load test with progress tracking`);
        console.log(`📊 Total Requests: ${this.multiConfig.totalRequests}`);
        console.log(`📈 Configurations: ${this.multiConfig.configs.length}`);
        console.log(`🔄 Distribution Strategy: ${this.multiConfig.distributionStrategy}`);
        console.log('');

        const startTime = Date.now();
        const results: RequestResult[] = [];
        let completed = 0;

        // Progress tracking
        const progressInterval = setInterval(() => {
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = completed / elapsed;
            console.log(`📊 Progress: ${completed}/${this.multiConfig.totalRequests} (${((completed / this.multiConfig.totalRequests) * 100).toFixed(1)}%) - ${rate.toFixed(1)} req/s`);
        }, this.options.progressInterval);

        try {
            // Create distribution plan
            const distributionPlan = this.createDistributionPlan();
            this.printDistributionPlan(distributionPlan);

            // Execute load test with progress tracking
            const loadTestResults = await this.executeLoadTestWithProgress(distributionPlan, results, () => completed++);
            completed = loadTestResults.length;

            clearInterval(progressInterval);

            const totalTime = Date.now() - startTime;
            const summary = ResultAnalyzer.analyzeResults(loadTestResults, totalTime);

            this.handleResults(summary);

            console.log(`🎯 Multi-config load test completed in ${(totalTime / 1000).toFixed(2)} seconds`);

            return summary;
        } catch (error) {
            clearInterval(progressInterval);
            console.error('❌ Multi-config load test failed:', error);
            throw error;
        }
    }

    /**
     * Create distribution plan based on strategy
     * 
     * @returns Distribution plan for all configurations
     */
    private createDistributionPlan(): DistributionPlan[] {
        const strategy = DistributionStrategyFactory.create(this.multiConfig.distributionStrategy);
        return strategy.distribute(this.multiConfig.configs, this.multiConfig.totalRequests);
    }

    /**
     * Print distribution plan to console
     * 
     * @param plan - Distribution plan to display
     */
    private printDistributionPlan(plan: DistributionPlan[]): void {
        console.log('📋 Distribution Plan:');
        console.log('===================');
        plan.forEach(p => {
            const config = this.multiConfig.configs.find(c => c.id === p.configId);
            console.log(`  ${p.configId}: ${p.requestCount} requests (weight: ${p.weight})`);
            console.log(`    URL: ${config?.url}`);
        });
        console.log('');
    }

    /**
     * Execute load test based on distribution plan
     * 
     * @param plan - Distribution plan
     * @returns Array of request results
     */
    private async executeLoadTest(plan: DistributionPlan[]): Promise<RequestResult[]> {
        const allResults: RequestResult[] = [];
        let globalRequestCounter = 1;

        // Execute requests for each configuration
        for (const planItem of plan) {
            const config = this.multiConfig.configs.find(c => c.id === planItem.configId);
            if (!config) continue;

            console.log(`🔄 Executing ${planItem.requestCount} requests for config: ${config.id}`);

            const configResults = await HttpClient.sendConcurrentRequests(
                config.url,
                {
                    method: config.method || 'GET',
                    headers: config.headers,
                    body: config.body,
                    timeout: config.timeout
                },
                planItem.requestCount,
                this.getEffectiveConcurrency(config),
                config.id
            );

            // Update request numbers and config IDs
            const updatedResults = configResults.map(result => ({
                ...result,
                reqNo: globalRequestCounter++,
                configId: config.id
            }));

            allResults.push(...updatedResults);
        }

        return allResults;
    }

    /**
     * Execute load test with progress tracking
     * 
     * @param plan - Distribution plan
     * @param results - Results array to populate
     * @param onComplete - Callback when request completes
     * @returns Array of request results
     */
    private async executeLoadTestWithProgress(
        plan: DistributionPlan[],
        results: RequestResult[],
        onComplete: () => void
    ): Promise<RequestResult[]> {
        let globalRequestCounter = 1;

        // Execute requests for each configuration
        for (const planItem of plan) {
            const config = this.multiConfig.configs.find(c => c.id === planItem.configId);
            if (!config) continue;

            console.log(`🔄 Executing ${planItem.requestCount} requests for config: ${config.id}`);

            const configResults = await this.executeConfigWithProgress(
                config,
                planItem.requestCount,
                globalRequestCounter,
                results,
                onComplete
            );

            globalRequestCounter += planItem.requestCount;
        }

        return results;
    }

    /**
     * Execute requests for a single configuration with progress tracking
     * 
     * @param config - Configuration to execute
     * @param requestCount - Number of requests to execute
     * @param startRequestNo - Starting request number
     * @param results - Results array to populate
     * @param onComplete - Callback when request completes
     */
    private async executeConfigWithProgress(
        config: LoadTestConfig,
        requestCount: number,
        startRequestNo: number,
        results: RequestResult[],
        onComplete: () => void
    ): Promise<void> {
        const promises: Promise<void>[] = [];
        let current = 0;
        const active = new Set<Promise<void>>();

        while (current < requestCount) {
            while (active.size < this.getEffectiveConcurrency(config) && current < requestCount) {
                const reqNo = startRequestNo + current++;
                const promise = HttpClient.sendRequest(
                    config.url,
                    {
                        method: config.method || 'GET',
                        headers: config.headers,
                        body: config.body,
                        timeout: config.timeout
                    },
                    reqNo,
                    config.id
                ).then(result => {
                    const updatedResult = {
                        ...result,
                        configId: config.id
                    };
                    results.push(updatedResult);
                    onComplete();
                    active.delete(promise);
                });
                active.add(promise);
            }
            await Promise.race(active);
        }

        await Promise.all(active);
    }

    /**
     * Get effective concurrency for a configuration
     * 
     * @param config - Configuration
     * @returns Effective concurrency limit
     */
    private getEffectiveConcurrency(config: LoadTestConfig): number {
        if (this.multiConfig.globalConcurrency) {
            return Math.min(config.concurrency, this.multiConfig.globalConcurrency);
        }
        return config.concurrency;
    }

    /**
     * Handle results display and saving
     * 
     * @param summary - Load test summary
     */
    private handleResults(summary: LoadTestSummary): void {
        // Display summary
        ResultAnalyzer.printSummary(summary);

        // Save results if enabled
        if (this.options.saveResults) {
            ResultAnalyzer.saveResults(summary, 'results.json', this.options.outputDir);

            if (this.options.generateCSV) {
                ResultAnalyzer.saveResultsAsCSV(summary.details, 'results.csv', this.options.outputDir);
                ResultAnalyzer.saveConfigSummariesAsCSV(summary.configSummaries, 'config-summaries.csv', this.options.outputDir);
                ResultAnalyzer.generateHTMLReport(summary, 'report.html', this.options.outputDir);
            }
        }
    }
}
