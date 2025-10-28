/**
 * Distribution Strategy Interfaces and Implementations
 * 
 * This module implements the Strategy pattern for distributing requests across
 * multiple configurations. It follows SOLID principles by providing a common
 * interface with different implementations.
 */

import { LoadTestConfig, DistributionPlan, DistributionStrategy } from '../types/load.types';

/**
 * Abstract base class for request distribution strategies
 * 
 * @abstract DistributionStrategyBase
 * @description Defines the contract for distributing requests across configurations
 */
export abstract class DistributionStrategyBase {
    /**
     * Distribute requests across configurations
     * 
     * @param configs - Array of load test configurations
     * @param totalRequests - Total number of requests to distribute
     * @returns Array of distribution plans
     */
    abstract distribute(configs: LoadTestConfig[], totalRequests: number): DistributionPlan[];
}

/**
 * Round-robin distribution strategy
 * 
 * @class RoundRobinDistribution
 * @description Distributes requests in a round-robin fashion: 1,2,3,1,2,3...
 */
export class RoundRobinDistribution extends DistributionStrategyBase {
    /**
     * Distribute requests using round-robin algorithm
     * 
     * @param configs - Array of load test configurations
     * @param totalRequests - Total number of requests to distribute
     * @returns Array of distribution plans
     */
    distribute(configs: LoadTestConfig[], totalRequests: number): DistributionPlan[] {
        const plans: DistributionPlan[] = configs.map(config => ({
            configId: config.id,
            requestCount: 0,
            weight: config.weight || 1
        }));

        // Round-robin distribution
        for (let i = 0; i < totalRequests; i++) {
            const configIndex = i % configs.length;
            plans[configIndex].requestCount++;
        }

        return plans;
    }
}

/**
 * Equal distribution strategy
 * 
 * @class EqualDistribution
 * @description Distributes requests equally among all configurations
 */
export class EqualDistribution extends DistributionStrategyBase {
    /**
     * Distribute requests equally among configurations
     * 
     * @param configs - Array of load test configurations
     * @param totalRequests - Total number of requests to distribute
     * @returns Array of distribution plans
     */
    distribute(configs: LoadTestConfig[], totalRequests: number): DistributionPlan[] {
        const baseRequestsPerConfig = Math.floor(totalRequests / configs.length);
        const remainder = totalRequests % configs.length;

        return configs.map((config, index) => ({
            configId: config.id,
            requestCount: baseRequestsPerConfig + (index < remainder ? 1 : 0),
            weight: config.weight || 1
        }));
    }
}

/**
 * Proportional distribution strategy
 * 
 * @class ProportionalDistribution
 * @description Distributes requests proportionally based on configuration weights
 */
export class ProportionalDistribution extends DistributionStrategyBase {
    /**
     * Distribute requests proportionally based on weights
     * 
     * @param configs - Array of load test configurations
     * @param totalRequests - Total number of requests to distribute
     * @returns Array of distribution plans
     */
    distribute(configs: LoadTestConfig[], totalRequests: number): DistributionPlan[] {
        const totalWeight = configs.reduce((sum, config) => sum + (config.weight || 1), 0);

        return configs.map(config => {
            const weight = config.weight || 1;
            const proportionalRequests = Math.round((weight / totalWeight) * totalRequests);

            return {
                configId: config.id,
                requestCount: proportionalRequests,
                weight
            };
        });
    }
}

/**
 * Distribution strategy factory
 * 
 * @class DistributionStrategyFactory
 * @description Factory class for creating distribution strategy instances
 */
export class DistributionStrategyFactory {
    /**
     * Create a distribution strategy instance
     * 
     * @param strategy - The distribution strategy type
     * @returns Instance of the distribution strategy
     * @throws Error if strategy is not supported
     */
    static create(strategy: DistributionStrategy): DistributionStrategyBase {
        switch (strategy) {
            case DistributionStrategy.ROUND_ROBIN:
                return new RoundRobinDistribution();
            case DistributionStrategy.EQUAL:
                return new EqualDistribution();
            case DistributionStrategy.PROPORTIONAL:
                return new ProportionalDistribution();
            default:
                throw new Error(`Unsupported distribution strategy: ${strategy}`);
        }
    }
}
