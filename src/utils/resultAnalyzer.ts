/**
 * Result Analyzer and File Writer
 * 
 * This module handles analysis and persistence of load test results.
 * It follows the Single Responsibility Principle by focusing solely on
 * result analysis and file operations.
 */

import fs from 'fs';
import path from 'path';
import { RequestResult, LoadTestSummary, ConfigSummary, LoadTestConfig } from '../types/load.types';

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
            const headers = ['Request No', 'Config ID', 'Status', 'Success', 'Time (ms)', 'Timestamp', 'Error', 'Response Size', 'Response Body', 'Response Headers'];
            const csvContent = [
                headers.join(','),
                ...results.map(r => [
                    r.reqNo,
                    r.configId,
                    r.status,
                    r.success,
                    r.timeTakenMs,
                    r.timestamp,
                    (r.error || '').replace(/,/g, ';'), // Replace commas to avoid CSV issues
                    r.responseSize || 0,
                    (r.responseBody || '').replace(/,/g, ';').replace(/\n/g, ' ').replace(/\r/g, ' '), // Clean response body for CSV
                    r.responseHeaders ? JSON.stringify(r.responseHeaders).replace(/,/g, ';') : ''
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
     * Generate a simple HTML report
     * 
     * @param summary - Load test summary
     * @param filename - Output filename
     * @param outputDir - Output directory (default: current directory)
     */
    static generateHTMLReport(summary: LoadTestSummary, config: LoadTestConfig, filename: string = 'report.html', outputDir: string = '.'): void {
        try {
            const filePath = path.join(outputDir, filename);
            const html = this.generateSimpleHTMLContent(summary, config);
            fs.writeFileSync(filePath, html);
            console.log(`✅ HTML report saved to ${filePath}`);
        } catch (error) {
            console.error(`❌ Failed to generate HTML report:`, error);
        }
    }

    /**
     * Generate simple HTML content for the report
     * 
     * @param summary - Load test summary
     * @returns HTML content string
     */
    private static generateSimpleHTMLContent(summary: LoadTestSummary, config: LoadTestConfig): string {
        const configSummariesHtml = Object.values(summary.configSummaries)
            .map(cs => `
                <tr>
                    <td class="config-id">${cs.configId}</td>
                    <td><span class="badge info">${cs.totalRequests}</span></td>
                    <td><span class="badge success">${cs.successful}</span></td>
                    <td><span class="badge danger">${cs.failed}</span></td>
                    <td><span class="badge ${cs.successRate >= 95 ? 'success' : cs.successRate >= 80 ? 'warning' : 'danger'}">${cs.successRate.toFixed(2)}%</span></td>
                    <td class="time-metric">${cs.averageTimeMs.toFixed(2)} ms</td>
                    <td class="time-metric">${cs.minTimeMs} ms</td>
                    <td class="time-metric">${cs.maxTimeMs} ms</td>
                </tr>
            `).join('');

        // Generate response data table if available
        const responseDataHtml = summary.details.some(r => r.responseBody || r.responseHeaders || r.error) ? `
            <div class="response-data-section">
                <h2><i class="icon">📋</i>Response Data Sample</h2>
                <div class="table-container">
                    <table class="response-table">
                        <thead>
                            <tr>
                                <th>Request No</th>
                                <th>Config ID</th>
                                <th>Status</th>
                                <th>Response Size</th>
                                <th>Time Taken</th>
                                <th>Error</th>
                                <th>Response Body (Preview)</th>
                                <th>Response Headers</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${summary.details.map(r => `
                                <tr>
                                    <td class="request-number">${r.reqNo}</td>
                                    <td class="config-id">${r.configId}</td>
                                    <td><span class="status-badge ${r.success ? 'success' : 'danger'}">${r.status}</span></td>
                                    <td class="size-metric">${r.responseSize || 0} bytes</td>
                                    <td class="time-metric">${r.timeTakenMs} ms</td>
                                    <td class="error-preview">${r.error ? JSON.parse(r.error)?.message : r.error}</td>
                                    <td class="response-preview">${r.responseBody ? (r.responseBody.length > 100 ? r.responseBody.substring(0, 100) + '...' : r.responseBody) : 'N/A'}</td>
                                    <td class="headers-count">${r.responseHeaders ? Object.keys(r.responseHeaders).length + ' headers' : 'N/A'}</td>
                                    <td class="action-buttons">
                                        ${r.responseBody || r.responseHeaders ? `
                                            <button class="btn-view-response" onclick="showFullResponse(${r.reqNo})" title="View Full Response">
                                                <i class="icon">👁️</i> View Full
                                            </button>
                                        ` : 'N/A'}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                <p class="sample-note"><i class="icon">ℹ️</i>Showing all requests with response data. <i class="icon">↔️</i> Scroll horizontally to view all columns. Click "View Full" to see complete response in formatted JSON. Full data available in JSON and CSV files.</p>
            </div>
        ` : '';

        const successRate = (summary.successful / summary.totalRequests) * 100;
        const successRateClass = successRate >= 95 ? 'success' : successRate >= 80 ? 'warning' : 'danger';

        return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Load Test Report - ${new Date().toLocaleString()}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #2c3e50;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 25px 50px rgba(0,0,0,0.15);
            overflow: hidden;
            backdrop-filter: blur(10px);
        }

        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            opacity: 0.3;
        }

        .header h1 {
            font-size: 3rem;
            font-weight: 300;
            margin-bottom: 15px;
            position: relative;
            z-index: 1;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .header .subtitle {
            font-size: 1.2rem;
            opacity: 0.9;
            position: relative;
            z-index: 1;
            font-weight: 300;
        }

        .content {
            padding: 50px;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
            margin-bottom: 50px;
        }

        .summary-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 30px;
            border-radius: 15px;
            border-left: 6px solid;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .summary-card::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 100px;
            height: 100px;
            background: linear-gradient(45deg, rgba(255,255,255,0.1), transparent);
            border-radius: 0 15px 0 100px;
        }

        .summary-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }

        .summary-card.overall {
            border-left-color: #28a745;
            background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
        }

        .summary-card.performance {
            border-left-color: #007bff;
            background: linear-gradient(135deg, #cce7ff 0%, #b3d9ff 100%);
        }

        .summary-card.timing {
            border-left-color: #ffc107;
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
        }

        .summary-card h2 {
            font-size: 1.5rem;
            margin-bottom: 20px;
            color: #2c3e50;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
        }

        .summary-card h2 .icon {
            font-size: 1.2rem;
        }

        .metric {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid rgba(0,0,0,0.1);
            transition: background 0.2s ease;
        }

        .metric:hover {
            background: rgba(255,255,255,0.5);
            border-radius: 8px;
            padding-left: 8px;
            padding-right: 8px;
        }

        .metric:last-child {
            border-bottom: none;
        }

        .metric-label {
            font-weight: 500;
            color: #555;
            font-size: 0.95rem;
        }

        .metric-value {
            font-weight: 700;
            font-size: 1.2rem;
            color: #2c3e50;
        }

        .metric-value.success {
            color: #28a745;
        }

        .metric-value.warning {
            color: #ffc107;
        }

        .metric-value.danger {
            color: #dc3545;
        }

        .metric-value.info {
            color: #007bff;
        }

        .section {
            margin-bottom: 50px;
        }

        .section h2 {
            font-size: 2rem;
            color: #2c3e50;
            margin-bottom: 25px;
            padding-bottom: 15px;
            border-bottom: 4px solid #007bff;
            display: flex;
            align-items: center;
            gap: 15px;
            font-weight: 600;
        }

        .section h2 .icon {
            font-size: 1.5rem;
        }

        .table-container {
            background: white;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            margin-bottom: 25px;
            border: 1px solid #e9ecef;
        }

        .response-data-section .table-container {
            overflow-x: auto;
            overflow-y: visible;
        }

        .response-data-section .table-container::-webkit-scrollbar {
            height: 8px;
        }

        .response-data-section .table-container::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
        }

        .response-data-section .table-container::-webkit-scrollbar-thumb {
            background: linear-gradient(135deg, #007bff, #6610f2);
            border-radius: 4px;
        }

        .response-data-section .table-container::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(135deg, #0056b3, #520dc2);
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 0.95rem;
        }

        th {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 20px 15px;
            text-align: left;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85rem;
            letter-spacing: 1px;
            position: relative;
        }

        th::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #007bff, #28a745);
        }

        td {
            padding: 15px;
            border-bottom: 1px solid #e9ecef;
            vertical-align: middle;
            transition: background 0.2s ease;
        }

        tr:hover td {
            background-color: #f8f9fa;
        }

        tr:nth-child(even) td {
            background-color: #f8f9fa;
        }

        tr:nth-child(even):hover td {
            background-color: #e9ecef;
        }

        .config-id {
            font-family: 'Courier New', 'Monaco', monospace;
            font-size: 0.9rem;
            color: #6c757d;
            font-weight: 600;
            background: #f8f9fa;
            padding: 4px 8px;
            border-radius: 6px;
            display: inline-block;
        }

        .time-metric {
            font-family: 'Courier New', 'Monaco', monospace;
            font-weight: 600;
            color: #495057;
        }

        .size-metric {
            font-family: 'Courier New', 'Monaco', monospace;
            font-weight: 600;
            color: #6c757d;
        }

        .request-number {
            font-family: 'Courier New', 'Monaco', monospace;
            font-weight: 600;
            color: #007bff;
        }

        .headers-count {
            font-size: 0.85rem;
            color: #6c757d;
        }

        .time-metric {
            font-family: 'Courier New', 'Monaco', monospace;
            font-weight: 600;
            color: #495057;
        }
        
        .

        .response-preview {
            max-width: 300px;
            word-wrap: break-word;
            font-family: 'Courier New', 'Monaco', monospace;
            font-size: 0.8rem;
            background: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
            border-left: 3px solid #007bff;
        }

        .error-preview {
            max-width: 300px;
            word-wrap: break-word;
            font-family: 'Courier New', 'Monaco', monospace;
            font-size: 0.8rem;
            background: #f8f9fa;
            padding: 8px;
            border-radius: 4px;
            border-left: 3px solid #dc3545;
        }

        .badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .badge.success {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
        }

        .badge.danger {
            background: linear-gradient(135deg, #dc3545, #e74c3c);
            color: white;
        }

        .badge.warning {
            background: linear-gradient(135deg, #ffc107, #fd7e14);
            color: white;
        }

        .badge.info {
            background: linear-gradient(135deg, #007bff, #6610f2);
            color: white;
        }

        .status-badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 15px;
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .status-badge.success {
            background: #28a745;
            color: white;
        }

        .status-badge.danger {
            background: #dc3545;
            color: white;
        }

        .response-data-section {
            background: linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%);
            padding: 30px;
            border-radius: 15px;
            margin: 30px 0;
            border-left: 6px solid #ffc107;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }

        .response-data-section h2 {
            color: #856404;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 1.5rem;
            font-weight: 600;
        }

        .response-table {
            min-width: 1200px;
        }

        .response-table th {
            background: linear-gradient(135deg, #856404 0%, #6c5ce7 100%);
            white-space: nowrap;
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .response-table td {
            background: rgba(255,255,255,0.8);
            white-space: nowrap;
        }

        .response-table .response-preview {
            white-space: normal;
            max-width: 300px;
            word-wrap: break-word;
        }

        .response-table .error-preview {
            white-space: normal;
            max-width: 200px;
            word-wrap: break-word;
        }

        .sample-note {
            margin-top: 20px;
            padding: 15px;
            background: rgba(255,255,255,0.7);
            border-radius: 8px;
            border-left: 4px solid #ffc107;
            font-style: italic;
            color: #856404;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .action-buttons {
            text-align: center;
        }

        .btn-view-response {
            background: linear-gradient(135deg, #007bff, #6610f2);
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            box-shadow: 0 2px 8px rgba(0,123,255,0.3);
        }

        .btn-view-response:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,123,255,0.4);
            background: linear-gradient(135deg, #0056b3, #520dc2);
        }

        .btn-view-response .icon {
            font-size: 0.9rem;
        }

        .error-preview {
            max-width: 200px;
            word-wrap: break-word;
            font-size: 0.85rem;
            color: #dc3545;
            background: #f8d7da;
            padding: 4px 8px;
            border-radius: 4px;
        }

        /* Modal Styles */
        .modal {
            display: none;
            position: fixed;
            z-index: 2000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.7);
            backdrop-filter: blur(5px);
        }

        .modal-content {
            background: white;
            margin: 5% auto;
            padding: 0;
            border-radius: 15px;
            width: 90%;
            max-width: 1000px;
            max-height: 80vh;
            box-shadow: 0 25px 50px rgba(0,0,0,0.3);
            overflow: hidden;
            animation: modalSlideIn 0.3s ease;
        }

        @keyframes modalSlideIn {
            from {
                opacity: 0;
                transform: translateY(-50px) scale(0.9);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        .modal-header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 20px 30px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .modal-header h3 {
            margin: 0;
            font-size: 1.5rem;
            font-weight: 600;
        }

        .close {
            color: white;
            font-size: 2rem;
            font-weight: bold;
            cursor: pointer;
            transition: color 0.3s ease;
            line-height: 1;
        }

        .close:hover {
            color: #ffc107;
        }

        .modal-body {
            padding: 30px;
            max-height: 60vh;
            overflow-y: auto;
        }

        .json-viewer {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            font-family: 'Courier New', 'Monaco', monospace;
            font-size: 0.9rem;
            line-height: 1.6;
            white-space: pre-wrap;
            word-wrap: break-word;
            max-height: 400px;
            overflow-y: auto;
            position: relative;
        }

        .json-viewer::before {
            content: 'JSON Response Data';
            position: absolute;
            top: -12px;
            left: 15px;
            background: #f8f9fa;
            padding: 0 10px;
            font-size: 0.8rem;
            font-weight: 600;
            color: #6c757d;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .copy-button {
            background: linear-gradient(135deg, #28a745, #20c997);
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 15px;
            transition: all 0.3s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }

        .copy-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(40,167,69,0.3);
        }

        .copy-button.copied {
            background: linear-gradient(135deg, #ffc107, #fd7e14);
        }

        .footer {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            text-align: center;
            padding: 30px;
            font-size: 0.9rem;
            opacity: 0.9;
        }

        .footer p {
            margin: 5px 0;
        }

        .scroll-to-top {
            position: fixed;
            bottom: 30px;
            right: 30px;
            background: linear-gradient(135deg, #007bff, #6610f2);
            color: white;
            border: none;
            border-radius: 50%;
            width: 60px;
            height: 60px;
            font-size: 1.5rem;
            cursor: pointer;
            box-shadow: 0 8px 20px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            opacity: 0;
            visibility: hidden;
            z-index: 1000;
        }

        .scroll-to-top.visible {
            opacity: 1;
            visibility: visible;
        }

        .scroll-to-top:hover {
            transform: translateY(-5px) scale(1.1);
            box-shadow: 0 12px 25px rgba(0,0,0,0.4);
        }

        @media (max-width: 768px) {
            body {
                padding: 10px;
            }
            
            .container {
                border-radius: 15px;
            }
            
            .content {
                padding: 30px 20px;
            }
            
            .summary-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }
            
            .header h1 {
                font-size: 2.2rem;
            }
            
            .section h2 {
                font-size: 1.6rem;
            }
            
            table {
                font-size: 0.85rem;
            }
            
            th, td {
                padding: 10px 8px;
            }
            
            .response-preview {
                max-width: 200px;
                font-size: 0.7rem;
            }
        }

        @media (max-width: 480px) {
            .header {
                padding: 30px 20px;
            }
            
            .header h1 {
                font-size: 1.8rem;
            }
            
            .content {
                padding: 20px 15px;
            }
            
            .summary-card {
                padding: 20px;
            }
            
            .table-container {
                overflow-x: auto;
            }
            
            table {
                min-width: 600px;
            }
        } 
        .info-note-box {
            background: #eef6fb;
            border-left: 6px solid #007bff;
            padding: 24px 18px;
            margin-bottom: 36px;
            border-radius: 10px;
            box-shadow: 0 4px 14px rgba(0,123,255,0.06);
        }
        .info-note-box h3 {
            color: #007bff;
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 14px;
            font-size: 1.15rem;
        }
        .explanation-list {
            margin-left: 1.1em;
            font-size: 1em;
            margin-bottom: 8px;
        }
        .explanation-list li {
            margin-bottom: 7px;
        }
        .scenario-explanation {
            background: #f8fafc;
            border-radius: 7px;
            padding: 10px 16px;
            margin-top: 10px;
            color: #213b53;
            font-size: 0.98em;
            border: 1px solid #e3eaf2;
        }
        .scenario-explanation strong, .info-note-box strong {
            color: #0056b3;
        }
        .icon {
            font-style: normal;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1><i class="icon">🚀</i>Load Test Report</h1>
            <div class="subtitle">Performance Analysis Dashboard</div>
        </div>
        
        <div class="content">
            <div class="summary-grid">
                <div class="summary-card overall">
                    <h2><i class="icon">📊</i>Overall Summary</h2>
                    <div class="metric">
                        <span class="metric-label">Total Requests</span>
                        <span class="metric-value info">${summary.totalRequests}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Successful</span>
                        <span class="metric-value success">${summary.successful}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Failed</span>
                        <span class="metric-value danger">${summary.failed}</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Success Rate</span>
                        <span class="metric-value ${successRateClass}">${successRate.toFixed(2)}%</span>
                    </div>
                </div>
                
                <div class="summary-card performance">
                    <h2><i class="icon">⚡</i>Performance Metrics</h2>
                    <div class="metric">
                        <span class="metric-label">Average Response Time</span>
                        <span class="metric-value warning">${summary.averageTimeMs.toFixed(2)} ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Min Response Time</span>
                        <span class="metric-value success">${summary.minTimeMs} ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Max Response Time</span>
                        <span class="metric-value danger">${summary.maxTimeMs} ms</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Throughput</span>
                        <span class="metric-value info">${summary.requestsPerSecond} req/s</span>
                    </div>
                </div>
                
                <div class="summary-card timing">
                    <h2><i class="icon">⏱️</i>Execution Details</h2>
                    <div class="metric">
                        <span class="metric-label">Total Execution Time</span>
                        <span class="metric-value info">${(summary.totalExecutionTimeMs / 1000).toFixed(2)} seconds</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Test Duration</span>
                        <span class="metric-value info">${(summary.totalExecutionTimeMs / 60000).toFixed(2)} minutes</span>
                    </div>
                    <div class="metric">
                        <span class="metric-label">Generated</span>
                        <span class="metric-value info">${new Date().toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div class="info-note-box">
                <h3><i class="icon">💡</i>Understanding Performance Metrics & Test Execution</h3>
                <ul class="explanation-list">
                    <li>
                        <strong>Min Response Time</strong> (<span class="metric-label">Min</span>): The shortest time (in milliseconds) it took to receive a complete response from your server for any single request during the test. A very low min response time indicates your fastest possible server response under test conditions.
                    </li>
                    <li>
                        <strong>Max Response Time</strong> (<span class="metric-label">Max</span>): The longest time (in milliseconds) it took to receive a response for a single request during the test. This can reflect occasional backend delays, server overload, or network issues.
                    </li>
                    <li>
                        <strong>Concurrency</strong>: This test was run with <b>${config.concurrency || 'N/A'}</b> concurrent requests. This means your system is being asked to handle <b>${config.concurrency || 'N/A'}</b> requests at the same time, not one after another.
                    </li>
                    <li>
                        <strong>Total Requests</strong>: A total of <b>${config?.totalRequests || summary.totalRequests}</b> requests were sent during the test.
                    </li>
                    <li>
                        <strong>Request Distribution</strong>: This test can use different request distribution strategies:
                        <ul>
                            <li>
                                <b>ROUND_ROBIN</b>: Requests are distributed across each configuration in turn one by one (e.g., 1,2,3,1,2,3).
                            </li>
                            <li>
                                <b>PROPORTIONAL</b>: Requests are assigned to each configuration based on their respective weights. Configs with higher weight get more requests.
                            </li>
                            <li>
                                <b>EQUAL</b>: Each configuration receives an equal number of requests, regardless of weight.
                            </li>
                        </ul>
                        <div>
                            <b>Currently used:</b>
                            <span style="color: #15803d;">
                                <b>${(config as any)?.distributionStrategy?.toUpperCase?.() || (typeof (config as any)?.distributionStrategy === 'string' ? (config as any).distributionStrategy.toUpperCase() : 'ROUND_ROBIN')}</b>
                            </span>
                        </div>
                         <div>
                             <b>How requests are sent:</b>
                             ${config.requestsPerSecond ? `
                                 <div style="margin-top: 8px;">
                                     <b>🎯 Rate Limited Mode:</b> Requests are sent at exactly <b>${config.requestsPerSecond}</b> requests per second (RPS). 
                                     The client maintains this fixed rate regardless of server response times.
                                 </div>
                                 <div style="margin-top: 8px;">
                                     <b>Concurrency:</b> Up to <b>${config?.concurrency || 'N/A'}</b> requests can be in flight simultaneously, 
                                     but new requests are only started at the specified RPS interval.
                                 </div>
                             ` : `
                                 <div style="margin-top: 8px;">
                                     The client always tries to keep <b>${config?.concurrency || 'N/A'}</b> requests running at the same time 
                                     (as soon as one finishes, another starts), until the total is reached. 
                                     There is <b>no fixed rate per second</b> — your server is "loaded" as quickly as responses come back and open a new slot.
                                 </div>
                             `}
                         </div>
                    </li>
                </ul>
                <div class="scenario-explanation">
                    <p>
                        <u><strong>How does this work?</strong></u>
                        ${config.requestsPerSecond ? `
                            <br>
                            <b>Rate Limited Scenario:</b> Your test is configured for <b>${config.totalRequests || summary.totalRequests}</b> total requests with a fixed rate of <b>${config.requestsPerSecond}</b> RPS:
                            <br>
                            <b>Step 1:</b> The client sends requests at exactly <b>${config.requestsPerSecond}</b> requests per second, maintaining precise timing.<br>
                            <b>Step 2:</b> Each request waits for its designated time slot before being sent, ensuring consistent rate limiting.<br>
                            <b>Step 3:</b> Up to <b>${config?.concurrency || 'N/A'}</b> requests can be in flight simultaneously, but new requests are only initiated at the RPS interval.<br>
                            <b>Result:</b> Your server receives a steady, predictable load at exactly <b>${config.requestsPerSecond}</b> RPS, making it ideal for testing rate limiting, throttling, and consistent load patterns.
                        ` : `
                            Let's suppose your test is set up for <b>100</b> total requests with concurrency set to <b>10</b>:
                            <br>
                            <b>Step 1:</b> The client sends <b>10</b> requests at once (all in parallel).<br>
                            <b>Step 2:</b> Whenever any one request finishes (gets a response from your server), the client immediately sends the next waiting request, so there are always 10 in progress up to the total.<br>
                            <b>Step 3:</b> This pattern continues, so after the first 10 finish, another 10 go out, and so on, until 100 requests in total have been sent.<br>
                            <b>Result:</b> The server's response speed will influence how quickly batches finish, and the <strong>min/max response times</strong> reflect the range of response speeds your users might experience. There's no deliberate delay or pacing; it's "as fast as your server (and network) will allow" at the chosen concurrency level.
                        `}
                    </p>
                </div>
            </div>
           
            <div class="section">
                <h2><i class="icon">📈</i>Per-Configuration Summary</h2>
                <div class="table-container">
                    <table>
                        <thead>
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
                        </thead>
                        <tbody>
                            ${configSummariesHtml}
                        </tbody>
                    </table>
                </div>
            </div>

            ${responseDataHtml}
        </div>
        
        <div class="footer">
            <p><strong>Load Test Report Generated on ${new Date().toLocaleString()}</strong></p>
            <p>Professional Performance Analysis Dashboard | Load Testing Tool</p>
        </div>
    </div>
    
    <button class="scroll-to-top" onclick="scrollToTop()">↑</button>
    
    <!-- Response Modal -->
    <div id="responseModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h3><i class="icon">📄</i>Full Response Data</h3>
                <span class="close" onclick="closeModal()">&times;</span>
            </div>
            <div class="modal-body">
                <div id="modalContent">
                    <!-- Content will be populated by JavaScript -->
                </div>
            </div>
        </div>
    </div>
    
    <script>
        // Make load test data available to JavaScript
        window.loadTestData = ${JSON.stringify(summary)};
        
        function scrollToTop() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }
        
        // Show/hide scroll to top button
        window.addEventListener('scroll', function() {
            const scrollButton = document.querySelector('.scroll-to-top');
            if (window.pageYOffset > 300) {
                scrollButton.classList.add('visible');
            } else {
                scrollButton.classList.remove('visible');
            }
        });
        
        // Add smooth animations to metrics
        document.addEventListener('DOMContentLoaded', function() {
            const metrics = document.querySelectorAll('.metric-value');
            metrics.forEach(metric => {
                metric.style.opacity = '0';
                metric.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    metric.style.transition = 'all 0.6s ease';
                    metric.style.opacity = '1';
                    metric.style.transform = 'translateY(0)';
                }, Math.random() * 500);
            });
        });

        // Modal functionality
        function showFullResponse(requestNo) {
            const modal = document.getElementById('responseModal');
            const modalContent = document.getElementById('modalContent');
            
            // Find the request data
            const requestData = window.loadTestData.details.find(r => r.reqNo === requestNo);
            
            if (!requestData) {
                alert('Request data not found');
                return;
            }

            // Create formatted JSON response
            const responseData = {
                requestNumber: requestData.reqNo,
                configId: requestData.configId,
                status: requestData.status,
                success: requestData.success,
                timeTakenMs: requestData.timeTakenMs,
                timestamp: requestData.timestamp,
                responseSize: requestData.responseSize,
                error: requestData.error,
                responseBody: requestData.responseBody ? JSON.parse(requestData.responseBody) : null,
                responseHeaders: requestData.responseHeaders
            };

            // Format JSON with proper indentation
            const formattedJson = JSON.stringify(responseData, null, 2);
            
            // Create modal content
            modalContent.innerHTML = \`
                <div class="json-viewer" id="jsonViewer">\${formattedJson}</div>
                <button class="copy-button" onclick="copyToClipboard()">
                    <i class="icon">📋</i> Copy to Clipboard
                </button>
            \`;

            // Show modal
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }

        function closeModal() {
            const modal = document.getElementById('responseModal');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }

        function copyToClipboard() {
            const jsonViewer = document.getElementById('jsonViewer');
            const copyButton = document.querySelector('.copy-button');
            
            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(jsonViewer.textContent).then(() => {
                    copyButton.innerHTML = '<i class="icon">✅</i> Copied!';
                    copyButton.classList.add('copied');
                    setTimeout(() => {
                        copyButton.innerHTML = '<i class="icon">📋</i> Copy to Clipboard';
                        copyButton.classList.remove('copied');
                    }, 2000);
                }).catch(err => {
                    console.error('Failed to copy: ', err);
                    fallbackCopyTextToClipboard(jsonViewer.textContent);
                });
            } else {
                fallbackCopyTextToClipboard(jsonViewer.textContent);
            }
        }

        function fallbackCopyTextToClipboard(text) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.top = "0";
            textArea.style.left = "0";
            textArea.style.position = "fixed";
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            try {
                document.execCommand('copy');
                const copyButton = document.querySelector('.copy-button');
                copyButton.innerHTML = '<i class="icon">✅</i> Copied!';
                copyButton.classList.add('copied');
                setTimeout(() => {
                    copyButton.innerHTML = '<i class="icon">📋</i> Copy to Clipboard';
                    copyButton.classList.remove('copied');
                }, 2000);
            } catch (err) {
                console.error('Fallback: Oops, unable to copy', err);
            }
            
            document.body.removeChild(textArea);
        }

        // Close modal when clicking outside
        window.onclick = function(event) {
            const modal = document.getElementById('responseModal');
            if (event.target === modal) {
                closeModal();
            }
        }

        // Close modal with Escape key
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeModal();
            }
        });
    </script>
</body>
</html>`;
    }
}
