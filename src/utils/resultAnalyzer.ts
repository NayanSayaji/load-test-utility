/**
 * Result Analyzer and File Writer
 * 
 * This module handles analysis and persistence of load test results.
 * It follows the Single Responsibility Principle by focusing solely on
 * result analysis and file operations.
 */

import fs from 'fs';
import path from 'path';
import { RequestResult, LoadTestSummary, ConfigSummary } from '../types/load.types';

/**
 * Result analyzer for load test results
 * 
 * @class ResultAnalyzer
 * @description Handles analysis and persistence of load test results
 */
export class ResultAnalyzer {
    /**
     * Analyze load test results and generate comprehensive summary
     * 
     * @param results - Array of request results
     * @param totalExecutionTimeMs - Total execution time in milliseconds
     * @returns Comprehensive load test summary
     */
    static analyzeResults(results: RequestResult[], totalExecutionTimeMs: number): LoadTestSummary {
        const successful = results.filter(r => r.success);
        const failed = results.filter(r => !r.success);
        const times = results.map(r => r.timeTakenMs);

        // Group results by configuration
        const resultsByConfig = this.groupResultsByConfig(results);

        // Generate summaries for each configuration
        const configSummaries = this.generateConfigSummaries(resultsByConfig);

        return {
            totalRequests: results.length,
            successful: successful.length,
            failed: failed.length,
            averageTimeMs: times.reduce((acc, time) => acc + time, 0) / times.length,
            minTimeMs: Math.min(...times),
            maxTimeMs: Math.max(...times),
            totalExecutionTimeMs,
            requestsPerSecond: (results.length / (totalExecutionTimeMs / 1000)).toFixed(2),
            details: results,
            resultsByConfig,
            configSummaries
        };
    }

    /**
     * Group results by configuration ID
     * 
     * @param results - Array of request results
     * @returns Results grouped by configuration ID
     */
    private static groupResultsByConfig(results: RequestResult[]): Record<string, RequestResult[]> {
        return results.reduce((groups, result) => {
            if (!groups[result.configId]) {
                groups[result.configId] = [];
            }
            groups[result.configId].push(result);
            return groups;
        }, {} as Record<string, RequestResult[]>);
    }

    /**
     * Generate summary statistics for each configuration
     * 
     * @param resultsByConfig - Results grouped by configuration
     * @returns Summary statistics for each configuration
     */
    private static generateConfigSummaries(resultsByConfig: Record<string, RequestResult[]>): Record<string, ConfigSummary> {
        const summaries: Record<string, ConfigSummary> = {};

        Object.entries(resultsByConfig).forEach(([configId, configResults]) => {
            const successful = configResults.filter(r => r.success);
            const failed = configResults.filter(r => !r.success);
            const times = configResults.map(r => r.timeTakenMs);

            summaries[configId] = {
                configId,
                totalRequests: configResults.length,
                successful: successful.length,
                failed: failed.length,
                successRate: (successful.length / configResults.length) * 100,
                averageTimeMs: times.reduce((acc, time) => acc + time, 0) / times.length,
                minTimeMs: Math.min(...times),
                maxTimeMs: Math.max(...times)
            };
        });

        return summaries;
    }

    /**
     * Save results to JSON file
     * 
     * @param summary - Load test summary to save
     * @param filename - Output filename
     * @param outputDir - Output directory (default: current directory)
     */
    static saveResults(summary: LoadTestSummary, filename: string = 'results.json', outputDir: string = '.'): void {
        try {
            const filePath = path.join(outputDir, filename);
            fs.writeFileSync(filePath, JSON.stringify(summary, null, 2));
            console.log(`✅ Results saved to ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to save results to ${filename}:`, error);
        }
    }

    /**
     * Print comprehensive summary to console
     * 
     * @param summary - Load test summary to display
     */
    static printSummary(summary: LoadTestSummary): void {
        console.log('\n📊 Load Test Summary:');
        console.log('==================');
        console.log(`Total Requests: ${summary.totalRequests}`);
        console.log(`Successful: ${summary.successful}`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`Success Rate: ${((summary.successful / summary.totalRequests) * 100).toFixed(2)}%`);
        console.log(`Average Response Time: ${summary.averageTimeMs.toFixed(2)} ms`);
        console.log(`Min Response Time: ${summary.minTimeMs} ms`);
        console.log(`Max Response Time: ${summary.maxTimeMs} ms`);
        console.log(`Total Execution Time: ${(summary.totalExecutionTimeMs / 1000).toFixed(2)} seconds`);
        console.log(`Throughput: ${summary.requestsPerSecond} requests/second`);

        // Print per-configuration summaries
        console.log('\n📈 Per-Configuration Summary:');
        console.log('============================');
        Object.values(summary.configSummaries).forEach(configSummary => {
            console.log(`\nConfig: ${configSummary.configId}`);
            console.log(`  Requests: ${configSummary.totalRequests}`);
            console.log(`  Success Rate: ${configSummary.successRate.toFixed(2)}%`);
            console.log(`  Avg Response Time: ${configSummary.averageTimeMs.toFixed(2)} ms`);
            console.log(`  Min/Max Response Time: ${configSummary.minTimeMs}/${configSummary.maxTimeMs} ms`);
        });

        console.log('==================\n');
    }

    /**
     * Save results in CSV format for easy analysis
     * 
     * @param results - Array of request results
     * @param filename - Output filename
     * @param outputDir - Output directory (default: current directory)
     */
    static saveResultsAsCSV(results: RequestResult[], filename: string = 'results.csv', outputDir: string = '.'): void {
        try {
            const headers = ['Request No', 'Config ID', 'Status', 'Success', 'Time (ms)', 'Timestamp', 'Error'];
            const csvContent = [
                headers.join(','),
                ...results.map(r => [
                    r.reqNo,
                    r.configId,
                    r.status,
                    r.success,
                    r.timeTakenMs,
                    r.timestamp,
                    (r.error || '').replace(/,/g, ';') // Replace commas to avoid CSV issues
                ].join(','))
            ].join('\n');

            const filePath = path.join(outputDir, filename);
            fs.writeFileSync(filePath, csvContent);
            console.log(`✅ CSV results saved to ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to save CSV results to ${filename}:`, error);
        }
    }

    /**
     * Save configuration summaries as CSV
     * 
     * @param configSummaries - Configuration summaries
     * @param filename - Output filename
     * @param outputDir - Output directory (default: current directory)
     */
    static saveConfigSummariesAsCSV(configSummaries: Record<string, ConfigSummary>, filename: string = 'config-summaries.csv', outputDir: string = '.'): void {
        try {
            const headers = ['Config ID', 'Total Requests', 'Successful', 'Failed', 'Success Rate (%)', 'Avg Time (ms)', 'Min Time (ms)', 'Max Time (ms)'];
            const csvContent = [
                headers.join(','),
                ...Object.values(configSummaries).map(cs => [
                    cs.configId,
                    cs.totalRequests,
                    cs.successful,
                    cs.failed,
                    cs.successRate.toFixed(2),
                    cs.averageTimeMs.toFixed(2),
                    cs.minTimeMs,
                    cs.maxTimeMs
                ].join(','))
            ].join('\n');

            const filePath = path.join(outputDir, filename);
            fs.writeFileSync(filePath, csvContent);
            console.log(`✅ Configuration summaries saved to ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to save configuration summaries to ${filename}:`, error);
        }
    }

    /**
     * Generate a detailed HTML report
     * 
     * @param summary - Load test summary
     * @param filename - Output filename
     * @param outputDir - Output directory (default: current directory)
     */
    static generateHTMLReport(summary: LoadTestSummary, filename: string = 'report.html', outputDir: string = '.'): void {
        try {
            const html = this.generateHTMLContent(summary);
            const filePath = path.join(outputDir, filename);
            fs.writeFileSync(filePath, html);
            console.log(`✅ HTML report saved to ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to generate HTML report:`, error);
        }
    }

    /**
     * Generate HTML content for the report
     * 
     * @param summary - Load test summary
     * @returns HTML content string
     */
    private static generateHTMLContent(summary: LoadTestSummary): string {
        const configSummariesHtml = Object.values(summary.configSummaries)
            .map(cs => `
        <tr>
          <td>${cs.configId}</td>
          <td>${cs.totalRequests}</td>
          <td>${cs.successful}</td>
          <td>${cs.failed}</td>
          <td>${cs.successRate.toFixed(2)}%</td>
          <td>${cs.averageTimeMs.toFixed(2)} ms</td>
          <td>${cs.minTimeMs} ms</td>
          <td>${cs.maxTimeMs} ms</td>
        </tr>
      `).join('');

        return `
<!DOCTYPE html>
<html>
<head>
    <title>Load Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .summary { background-color: #e7f3ff; padding: 15px; border-radius: 5px; }
        .config-summary { background-color: #f9f9f9; padding: 15px; border-radius: 5px; }
    </style>
</head>
<body>
    <h1>Load Test Report</h1>
    
    <div class="summary">
        <h2>Overall Summary</h2>
        <p><strong>Total Requests:</strong> ${summary.totalRequests}</p>
        <p><strong>Successful:</strong> ${summary.successful}</p>
        <p><strong>Failed:</strong> ${summary.failed}</p>
        <p><strong>Success Rate:</strong> ${((summary.successful / summary.totalRequests) * 100).toFixed(2)}%</p>
        <p><strong>Average Response Time:</strong> ${summary.averageTimeMs.toFixed(2)} ms</p>
        <p><strong>Min Response Time:</strong> ${summary.minTimeMs} ms</p>
        <p><strong>Max Response Time:</strong> ${summary.maxTimeMs} ms</p>
        <p><strong>Total Execution Time:</strong> ${(summary.totalExecutionTimeMs / 1000).toFixed(2)} seconds</p>
        <p><strong>Throughput:</strong> ${summary.requestsPerSecond} requests/second</p>
    </div>

    <div class="config-summary">
        <h2>Per-Configuration Summary</h2>
        <table>
            <tr>
                <th>Config ID</th>
                <th>Total Requests</th>
                <th>Successful</th>
                <th>Failed</th>
                <th>Success Rate (%)</th>
                <th>Avg Time (ms)</th>
                <th>Min Time (ms)</th>
                <th>Max Time (ms)</th>
            </tr>
            ${configSummariesHtml}
        </table>
    </div>
</body>
</html>`;
    }
}
