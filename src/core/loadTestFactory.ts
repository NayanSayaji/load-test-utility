/**
 * Load Test Factory
 * 
 * This module implements the Factory pattern for creating load test instances.
 * It follows SOLID principles by providing a centralized way to create
 * different types of load tests with proper configuration validation.
 */

import { MultiConfigLoadTestRunner } from './multiConfigLoadTestRunner';
import { ConfigurationManager } from './configurationManager';
import {
    MultiConfigLoadTest,
    LoadTestConfig,
    LoadTestOptions,
    DistributionStrategy
} from '../types/load.types';
import { SECTION_MAP_KEYS } from '../config/loadTest.config';

const PRIP_API_CONFIGS = (id: string, step: string): LoadTestConfig => ({
    id: `${id}-${step}`,
    // url: `https://prip.pharma-dept.gov.in/api/project/${id}/details/${step}`,
    url: `https://prip.pharma-dept.gov.in/api/project?page=1&sortColumn=createdAt&sortOrder=DESC`,
    totalRequests: 1000,
    concurrency: 100,
    requestsPerSecond: 100,
    method: 'GET',
    headers: {
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-Mode': 'cors',
        'accept': 'application/json, text/html, */*',
        'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU2NThlN2Q1LTBiOTctNDhkMS04ODA1LTZmYjg0YjY1Zjg2ZCIsImlhdCI6MTc2MTcxNDU1NiwiZXhwIjoxNzYxNzE4MTU2fQ.u0TVexG-8lSUsByD1N1feoqvFpIyQCEpuJZRYTQSkL8',
        'ngrok-skip-browser-warning': 'true',
        'x-api-key': 'wWHpU1gJOB4vALtObKanPljBWDxBp79B',
        'Referer': 'https://prip.pharma-dept.gov.in/project/59e3d6ed-ac6a-431d-967a-67bb7c228d55',
        'User-Agent': 'mozilla/5.0 (windows nt 10.0; win64; x64) applewebkit/537.36 (khtml, like gecko) chrome/120.0.0.0 safari/537.36'
    }
})

/**
 * Load test factory for creating different types of load tests
 * 
 * @class LoadTestFactory
 * @description Factory class for creating load test instances
 */
export class LoadTestFactory {
    /**
     * Create a multi-configuration load test runner
     * 
     * @param configs - Array of load test configurations
     * @param totalRequests - Total number of requests across all configs
     * @param distributionStrategy - Strategy for distributing requests
     * @param options - Load test execution options
     * @returns Configured multi-config load test runner
     * @throws ConfigurationError if validation fails
     */
    static createMultiConfigLoadTest(
        configs: LoadTestConfig[],
        totalRequests: number,
        distributionStrategy: DistributionStrategy = DistributionStrategy.ROUND_ROBIN,
        options?: LoadTestOptions
    ): MultiConfigLoadTestRunner {
        const multiConfig: MultiConfigLoadTest = {
            configs,
            totalRequests,
            distributionStrategy
        };

        const validatedConfig = ConfigurationManager.validateAndNormalizeMultiConfig(multiConfig);
        return new MultiConfigLoadTestRunner(validatedConfig, options);
    }

    /**
     * Create a multi-config load test from a single configuration
     * 
     * @param config - Single load test configuration
     * @param options - Load test execution options
     * @returns Configured multi-config load test runner
     * @throws ConfigurationError if validation fails
     */
    static createSingleConfigLoadTest(
        config: LoadTestConfig,
        options?: LoadTestOptions
    ): MultiConfigLoadTestRunner {
        const validatedConfig = ConfigurationManager.validateAndNormalizeConfig(config);

        return this.createMultiConfigLoadTest(
            [validatedConfig],
            validatedConfig.totalRequests,
            DistributionStrategy.EQUAL,
            options
        );
    }

    /**
     * Create a load test from environment variables
     * 
     * @param configIds - Array of configuration IDs to create from env vars
     * @param totalRequests - Total number of requests
     * @param distributionStrategy - Strategy for distributing requests
     * @param options - Load test execution options
     * @returns Configured multi-config load test runner
     * @throws ConfigurationError if validation fails
     */
    static createFromEnvironment(
        configIds: string[],
        totalRequests: number,
        distributionStrategy: DistributionStrategy = DistributionStrategy.ROUND_ROBIN,
        options?: LoadTestOptions
    ): MultiConfigLoadTestRunner {
        const configs = configIds.map(id =>
            ConfigurationManager.createConfigFromEnv(id, `${id.toUpperCase()}_`)
        );

        return this.createMultiConfigLoadTest(configs, totalRequests, distributionStrategy, options);
    }

    /**
     * Create a load test with predefined configurations
     * 
     * @param presetName - Name of the preset configuration
     * @param totalRequests - Total number of requests
     * @param options - Load test execution options
     * @returns Configured multi-config load test runner
     * @throws Error if preset is not found
     */
    static createFromPreset(
        presetName: string,
        totalRequests: number,
        options?: LoadTestOptions
    ): MultiConfigLoadTestRunner {
        const preset = this.getPresetConfigurations(presetName);
        if (!preset) {
            throw new Error(`Preset configuration '${presetName}' not found`);
        }

        return this.createMultiConfigLoadTest(
            preset.configs,
            totalRequests,
            preset.distributionStrategy,
            options
        );
    }

    /**
     * Get predefined configuration presets
     * 
     * @param presetName - Name of the preset
     * @returns Preset configuration or null if not found
     */
    private static getPresetConfigurations(presetName: string): { configs: LoadTestConfig[], distributionStrategy: DistributionStrategy } | null {
        const presets: Record<string, { configs: LoadTestConfig[], distributionStrategy: DistributionStrategy }> = {
            'api-test': {
                configs: [
                    {
                        id: 'api1',
                        url: 'https://jsonplaceholder.typicode.com/posts',
                        totalRequests: 10,
                        concurrency: 5,
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    },
                    {
                        id: 'api2',
                        url: 'https://jsonplaceholder.typicode.com/users',
                        totalRequests: 10,
                        concurrency: 5,
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    }
                ],
                distributionStrategy: DistributionStrategy.ROUND_ROBIN
            },
            'pharma-api': {
                configs: [
                    ...Object.values(SECTION_MAP_KEYS).slice(0, 1).map((key: string) => PRIP_API_CONFIGS('be57024a-3688-42e3-90d5-6b8ebd446b7c', key)),
                ],
                distributionStrategy: DistributionStrategy.ROUND_ROBIN
            }
        };

        return presets[presetName] || null;
    }

    /**
     * Create a load test with custom distribution weights
     * 
     * @param configs - Array of load test configurations with weights
     * @param totalRequests - Total number of requests
     * @param options - Load test execution options
     * @returns Configured multi-config load test runner
     * @throws ConfigurationError if validation fails
     */
    static createWithWeights(
        configs: LoadTestConfig[],
        totalRequests: number,
        options?: LoadTestOptions
    ): MultiConfigLoadTestRunner {
        return this.createMultiConfigLoadTest(
            configs,
            totalRequests,
            DistributionStrategy.PROPORTIONAL,
            options
        );
    }

    /**
     * List available preset configurations
     * 
     * @returns Array of preset names
     */
    static listPresets(): string[] {
        return ['api-test', 'pharma-api'];
    }

    /**
     * Validate configuration before creating load test
     * 
     * @param configs - Array of configurations to validate
     * @returns True if all configurations are valid
     * @throws ConfigurationError if validation fails
     */
    static validateConfigurations(configs: LoadTestConfig[]): boolean {
        configs.forEach(config => {
            ConfigurationManager.validateAndNormalizeConfig(config);
        });
        return true;
    }
}
