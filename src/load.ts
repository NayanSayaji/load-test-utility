/**
 * Load Testing Application - Main Entry Point
 * 
 * This is the main entry point for the load testing application.
 * It demonstrates various ways to create and run load tests using
 * the factory pattern and different distribution strategies.
 */

import { LoadTestFactory } from './core/loadTestFactory';
import { DistributionStrategy, LoadTestConfig } from './types/load.types';

/**
 * Example configurations for demonstration
 */
const exampleConfigs: LoadTestConfig[] = [
    {
        id: 'api1',
        url: 'https://jsonplaceholder.typicode.com/posts',
        totalRequests: 5,
        concurrency: 3,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        weight: 1
    },
    {
        id: 'api2',
        url: 'https://jsonplaceholder.typicode.com/users',
        totalRequests: 5,
        concurrency: 3,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        weight: 2
    },
    {
        id: 'api3',
        url: 'https://jsonplaceholder.typicode.com/comments',
        totalRequests: 5,
        concurrency: 3,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        weight: 1
    }
];

/**
 * Run load test based on command line arguments or environment variables
 */
async function runLoadTest() {
    try {
        console.log('🚀 Load Testing Application Starting...\n');

        // Determine test type from environment variables
        const testType = process.env.TEST_TYPE || 'multi-config';
        const totalRequests = parseInt(process.env.TOTAL_REQUESTS || '15');
        const distributionStrategy = (process.env.DISTRIBUTION_STRATEGY as DistributionStrategy) || DistributionStrategy.ROUND_ROBIN;
        const showProgress = process.env.PROGRESS === 'true';
        const usePreset = process.env.USE_PRESET;

        let loadTestRunner;

        switch (testType) {
            case 'single-config':
                console.log('📊 Running single configuration test');
                loadTestRunner = LoadTestFactory.createSingleConfigLoadTest(exampleConfigs[0], {
                    showProgress,
                    saveResults: true,
                    generateCSV: true
                });
                break;

            case 'multi-config':
                console.log('📊 Running multi-configuration test');
                console.log(`🔄 Distribution Strategy: ${distributionStrategy}`);
                loadTestRunner = LoadTestFactory.createMultiConfigLoadTest(
                    exampleConfigs,
                    totalRequests,
                    distributionStrategy,
                    {
                        showProgress,
                        saveResults: true,
                        generateCSV: true
                    }
                );
                break;

            case 'preset':
                if (!usePreset) {
                    console.log('❌ USE_PRESET environment variable is required for preset tests');
                    console.log('Available presets:', LoadTestFactory.listPresets().join(', '));
                    process.exit(1);
                }
                console.log(`📊 Running preset test: ${usePreset}`);
                loadTestRunner = LoadTestFactory.createFromPreset(usePreset, totalRequests, {
                    showProgress,
                    saveResults: true,
                    generateCSV: true
                });
                break;

            case 'environment':
                console.log('📊 Running test from environment variables');
                const configIds = (process.env.CONFIG_IDS || 'API1,API2').split(',').map(id => id.trim());
                loadTestRunner = LoadTestFactory.createFromEnvironment(
                    configIds,
                    totalRequests,
                    distributionStrategy,
                    {
                        showProgress,
                        saveResults: true,
                        generateCSV: true
                    }
                );
                break;

            case 'weighted':
                console.log('📊 Running weighted distribution test');
                loadTestRunner = LoadTestFactory.createWithWeights(exampleConfigs, totalRequests, {
                    showProgress,
                    saveResults: true,
                    generateCSV: true
                });
                break;

            default:
                console.log('❌ Unknown test type:', testType);
                console.log('Available test types: single-config, multi-config, preset, environment, weighted');
                process.exit(1);
        }

        // Run the load test
        if (showProgress) {
            await loadTestRunner.runWithProgress();
        } else {
            await loadTestRunner.run();
        }

        console.log('✅ Load test completed successfully!');

    } catch (error) {
        console.error('❌ Load test failed:', error);
        process.exit(1);
    }
}

/**
 * Display usage information
 */
function displayUsage() {
    console.log(`
📖 Load Testing Application Usage

Environment Variables:
  TEST_TYPE              - Type of test to run (single-config, multi-config, preset, environment, weighted)
  TOTAL_REQUESTS         - Total number of requests (default: 15)
  DISTRIBUTION_STRATEGY  - Distribution strategy (round_robin, equal, proportional)
  PROGRESS               - Show progress updates (true/false)
  USE_PRESET            - Preset name for preset tests
  CONFIG_IDS            - Comma-separated config IDs for environment tests

Examples:
  # Run multi-config test with round-robin distribution
  TEST_TYPE=multi-config TOTAL_REQUESTS=20 DISTRIBUTION_STRATEGY=round_robin npm run start

  # Run preset test with progress
  TEST_TYPE=preset USE_PRESET=pharma-api PROGRESS=true npm run start

  # Run weighted distribution test
  TEST_TYPE=weighted TOTAL_REQUESTS=30 npm run start

  # Run single config test
  TEST_TYPE=single-config npm run start

Available Presets: ${LoadTestFactory.listPresets().join(', ')}
`);
}

// Check if help is requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
    displayUsage();
    process.exit(0);
}

// Run the load test
runLoadTest();