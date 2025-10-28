/**
 * Types and interfaces for load testing application
 * 
 * This module defines all the core types used throughout the load testing system.
 * It follows the Single Responsibility Principle by focusing solely on type definitions.
 */

/**
 * Distribution strategy for multi-config load testing
 * 
 * @enum DistributionStrategy
 * @description Defines how requests are distributed across multiple configurations
 */
export enum DistributionStrategy {
    /** Round-robin distribution: 1,2,3,1,2,3... */
    ROUND_ROBIN = 'round_robin',
    /** Proportional distribution: distribute based on config weights */
    PROPORTIONAL = 'proportional',
    /** Equal distribution: each config gets equal number of requests */
    EQUAL = 'equal'
}

/**
 * Individual load test configuration
 * 
 * @interface LoadTestConfig
 * @description Represents a single API endpoint configuration for load testing
 */
export interface LoadTestConfig {
    /** Unique identifier for this configuration */
    id: string;
    /** Total number of requests to send for this config */
    totalRequests: number;
    /** Maximum concurrent requests for this config */
    concurrency: number;
    /** Target URL for the API endpoint */
    url: string;
    /** HTTP headers to include in requests */
    headers: Record<string, string>;
    /** HTTP method to use */
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    /** Request body for POST/PUT requests */
    body?: string;
    /** Weight for proportional distribution (default: 1) */
    weight?: number;
    /** Timeout in milliseconds (default: 30000) */
    timeout?: number;
}

/**
 * Multi-configuration load test setup
 * 
 * @interface MultiConfigLoadTest
 * @description Configuration for running load tests across multiple endpoints
 */
export interface MultiConfigLoadTest {
    /** List of configurations to test */
    configs: LoadTestConfig[];
    /** Total number of requests across all configs */
    totalRequests: number;
    /** Distribution strategy to use */
    distributionStrategy: DistributionStrategy;
    /** Global concurrency limit across all configs */
    globalConcurrency?: number;
}

/**
 * Result of a single HTTP request
 * 
 * @interface RequestResult
 * @description Captures the outcome and performance metrics of a single request
 */
export interface RequestResult {
    /** Request sequence number */
    reqNo: number;
    /** Configuration ID this request belongs to */
    configId: string;
    /** HTTP status code or 'ERROR' for network failures */
    status: number | 'ERROR';
    /** Whether the request was successful (2xx status) */
    success: boolean;
    /** Time taken for the request in milliseconds */
    timeTakenMs: number;
    /** Error message if request failed */
    error?: string;
    /** Timestamp when request completed */
    timestamp: string;
    /** Response size in bytes (if available) */
    responseSize?: number;
}

/**
 * Summary statistics for load test results
 * 
 * @interface LoadTestSummary
 * @description Aggregated statistics and performance metrics
 */
export interface LoadTestSummary {
    /** Total number of requests executed */
    totalRequests: number;
    /** Number of successful requests */
    successful: number;
    /** Number of failed requests */
    failed: number;
    /** Average response time in milliseconds */
    averageTimeMs: number;
    /** Minimum response time in milliseconds */
    minTimeMs: number;
    /** Maximum response time in milliseconds */
    maxTimeMs: number;
    /** Total execution time in milliseconds */
    totalExecutionTimeMs: number;
    /** Requests per second throughput */
    requestsPerSecond: string;
    /** Detailed results for each request */
    details: RequestResult[];
    /** Results grouped by configuration */
    resultsByConfig: Record<string, RequestResult[]>;
    /** Summary statistics per configuration */
    configSummaries: Record<string, ConfigSummary>;
}

/**
 * Summary statistics for a specific configuration
 * 
 * @interface ConfigSummary
 * @description Performance metrics for a single configuration
 */
export interface ConfigSummary {
    /** Configuration ID */
    configId: string;
    /** Number of requests for this config */
    totalRequests: number;
    /** Successful requests count */
    successful: number;
    /** Failed requests count */
    failed: number;
    /** Success rate percentage */
    successRate: number;
    /** Average response time */
    averageTimeMs: number;
    /** Min response time */
    minTimeMs: number;
    /** Max response time */
    maxTimeMs: number;
}

/**
 * HTTP request options
 * 
 * @interface HttpRequestOptions
 * @description Options for making HTTP requests
 */
export interface HttpRequestOptions {
    /** HTTP method */
    method: string;
    /** Request headers */
    headers: Record<string, string>;
    /** Request body */
    body?: string;
    /** Request timeout in milliseconds */
    timeout?: number;
}

/**
 * Request distribution plan
 * 
 * @interface DistributionPlan
 * @description Defines how requests are distributed across configurations
 */
export interface DistributionPlan {
    /** Configuration ID */
    configId: string;
    /** Number of requests assigned to this config */
    requestCount: number;
    /** Weight used for distribution */
    weight: number;
}

/**
 * Load test execution options
 * 
 * @interface LoadTestOptions
 * @description Options for controlling load test execution
 */
export interface LoadTestOptions {
    /** Whether to show progress updates during execution */
    showProgress?: boolean;
    /** Progress update interval in milliseconds */
    progressInterval?: number;
    /** Whether to save results to files */
    saveResults?: boolean;
    /** Output directory for result files */
    outputDir?: string;
    /** Whether to generate CSV output */
    generateCSV?: boolean;
}
