/**
 * Configuration Manager
 * 
 * This module handles configuration validation, normalization, and management.
 * It follows the Single Responsibility Principle by focusing solely on configuration
 * handling and validation logic.
 */

import { LoadTestConfig, MultiConfigLoadTest, DistributionStrategy } from '../types/load.types';

/**
 * Configuration validation error
 * 
 * @class ConfigurationError
 * @description Custom error for configuration validation failures
 */
export class ConfigurationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Configuration manager for load testing
 * 
 * @class ConfigurationManager
 * @description Handles validation, normalization, and management of load test configurations
 */
export class ConfigurationManager {
  /**
   * Validate a single load test configuration
   * 
   * @param config - Configuration to validate
   * @throws ConfigurationError if validation fails
   */
  private static validateSingleConfig(config: LoadTestConfig): void {
    if (!config.id || typeof config.id !== 'string' || config.id.trim() === '') {
      throw new ConfigurationError('Configuration ID is required and must be a non-empty string', 'id');
    }

    if (!config.url || typeof config.url !== 'string' || config.url.trim() === '') {
      throw new ConfigurationError('URL is required and must be a non-empty string', 'url');
    }

    if (!this.isValidUrl(config.url)) {
      throw new ConfigurationError('URL must be a valid HTTP/HTTPS URL', 'url');
    }

    if (typeof config.totalRequests !== 'number' || config.totalRequests <= 0) {
      throw new ConfigurationError('Total requests must be a positive number', 'totalRequests');
    }

    if (typeof config.concurrency !== 'number' || config.concurrency <= 0) {
      throw new ConfigurationError('Concurrency must be a positive number', 'concurrency');
    }

    if (config.concurrency > config.totalRequests) {
      throw new ConfigurationError('Concurrency cannot be greater than total requests', 'concurrency');
    }

    if (config.headers && typeof config.headers !== 'object') {
      throw new ConfigurationError('Headers must be an object', 'headers');
    }

    if (config.method && !['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method)) {
      throw new ConfigurationError('Method must be one of: GET, POST, PUT, DELETE, PATCH', 'method');
    }

    if (config.weight !== undefined && (typeof config.weight !== 'number' || config.weight <= 0)) {
      throw new ConfigurationError('Weight must be a positive number', 'weight');
    }

    if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new ConfigurationError('Timeout must be a positive number', 'timeout');
    }
  }

  /**
   * Validate multi-config load test setup
   * 
   * @param multiConfig - Multi-configuration setup to validate
   * @throws ConfigurationError if validation fails
   */
  private static validateMultiConfig(multiConfig: MultiConfigLoadTest): void {
    if (!multiConfig.configs || !Array.isArray(multiConfig.configs) || multiConfig.configs.length === 0) {
      throw new ConfigurationError('At least one configuration is required', 'configs');
    }

    if (typeof multiConfig.totalRequests !== 'number' || multiConfig.totalRequests <= 0) {
      throw new ConfigurationError('Total requests must be a positive number', 'totalRequests');
    }

    if (!Object.values(DistributionStrategy).includes(multiConfig.distributionStrategy)) {
      throw new ConfigurationError('Invalid distribution strategy', 'distributionStrategy');
    }

    if (multiConfig.globalConcurrency !== undefined && 
        (typeof multiConfig.globalConcurrency !== 'number' || multiConfig.globalConcurrency <= 0)) {
      throw new ConfigurationError('Global concurrency must be a positive number', 'globalConcurrency');
    }

    // Validate each individual configuration
    multiConfig.configs.forEach((config, index) => {
      try {
        this.validateSingleConfig(config);
      } catch (error) {
        if (error instanceof ConfigurationError) {
          throw new ConfigurationError(`Configuration ${index}: ${error.message}`, `configs[${index}].${error.field}`);
        }
        throw error;
      }
    });

    // Check for duplicate configuration IDs
    const ids = multiConfig.configs.map(config => config.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      throw new ConfigurationError(`Duplicate configuration IDs found: ${duplicateIds.join(', ')}`, 'configs');
    }
  }

  /**
   * Normalize a single configuration by applying defaults
   * 
   * @param config - Configuration to normalize
   * @returns Normalized configuration
   */
  private static normalizeSingleConfig(config: LoadTestConfig): LoadTestConfig {
    return {
      ...config,
      method: config.method || 'GET',
      weight: config.weight || 1,
      timeout: config.timeout || 30000,
      headers: config.headers || {},
      body: config.body || undefined
    };
  }

  /**
   * Normalize multi-config setup by applying defaults
   * 
   * @param multiConfig - Multi-configuration setup to normalize
   * @returns Normalized multi-configuration setup
   */
  private static normalizeMultiConfig(multiConfig: MultiConfigLoadTest): MultiConfigLoadTest {
    return {
      ...multiConfig,
      configs: multiConfig.configs.map(config => this.normalizeSingleConfig(config)),
      globalConcurrency: multiConfig.globalConcurrency || undefined
    };
  }

  /**
   * Validate and normalize a single configuration
   * 
   * @param config - Configuration to validate and normalize
   * @returns Validated and normalized configuration
   * @throws ConfigurationError if validation fails
   */
  static validateAndNormalizeConfig(config: LoadTestConfig): LoadTestConfig {
    this.validateSingleConfig(config);
    return this.normalizeSingleConfig(config);
  }

  /**
   * Validate and normalize multi-config setup
   * 
   * @param multiConfig - Multi-configuration setup to validate and normalize
   * @returns Validated and normalized multi-configuration setup
   * @throws ConfigurationError if validation fails
   */
  static validateAndNormalizeMultiConfig(multiConfig: MultiConfigLoadTest): MultiConfigLoadTest {
    this.validateMultiConfig(multiConfig);
    return this.normalizeMultiConfig(multiConfig);
  }

  /**
   * Check if a string is a valid URL
   * 
   * @param url - URL string to validate
   * @returns True if URL is valid, false otherwise
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol);
    } catch {
      return false;
    }
  }

  /**
   * Create a configuration from environment variables
   * 
   * @param id - Configuration ID
   * @param envPrefix - Environment variable prefix (e.g., 'API1_')
   * @returns Configuration created from environment variables
   */
  static createConfigFromEnv(id: string, envPrefix: string): LoadTestConfig {
    const config: LoadTestConfig = {
      id,
      url: process.env[`${envPrefix}URL`] || '',
      totalRequests: parseInt(process.env[`${envPrefix}TOTAL_REQUESTS`] || '10'),
      concurrency: parseInt(process.env[`${envPrefix}CONCURRENCY`] || '5'),
      method: (process.env[`${envPrefix}METHOD`] as any) || 'GET',
      headers: this.parseHeadersFromEnv(envPrefix),
      weight: parseInt(process.env[`${envPrefix}WEIGHT`] || '1'),
      timeout: parseInt(process.env[`${envPrefix}TIMEOUT`] || '30000')
    };

    return this.validateAndNormalizeConfig(config);
  }

  /**
   * Parse headers from environment variables
   * 
   * @param envPrefix - Environment variable prefix
   * @returns Headers object
   */
  private static parseHeadersFromEnv(envPrefix: string): Record<string, string> {
    const headers: Record<string, string> = {};
    const headerPrefix = `${envPrefix}HEADER_`;
    
    Object.keys(process.env)
      .filter(key => key.startsWith(headerPrefix))
      .forEach(key => {
        const headerName = key.substring(headerPrefix.length).toLowerCase().replace(/_/g, '-');
        headers[headerName] = process.env[key] || '';
      });

    return headers;
  }
}
