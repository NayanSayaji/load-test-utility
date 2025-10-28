/**
 * Load Test Configuration
 * Centralized configuration for load testing parameters
 */
import dotenv from 'dotenv';
import { LoadTestConfig } from '../types/load.types';

dotenv.config();

export const loadTestConfig: LoadTestConfig = {
    id: 'loadTest1',
    totalRequests: parseInt(process.env.TOTAL_REQUESTS || '50'),
    concurrency: parseInt(process.env.CONCURRENCY || '10'),
    url: process.env.URL || "https://prip.pharma-dept.gov.in/api/project/59e3d6ed-ac6a-431d-967a-67bb7c228d55/details/projectDetails",
    method: 'GET',
    headers: {
        "accept": "application/json, text/plain, */*",
        "accept-language": "en-GB,en-US;q=0.9,en;q=0.8",
        "authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU2NThlN2Q1LTBiOTctNDhkMS04ODA1LTZmYjg0YjY1Zjg2ZCIsImlhdCI6MTc2MTYzMzE4MCwiZXhwIjoxNzYxNjM2NzgwfQ.vlhYtMTOyG-cyG1AVtEnLys1duWBhCyEya9LDXdgkS0",
        "ngrok-skip-browser-warning": "true",
        "x-api-key": "wWHpU1gJOB4vALtObKanPljBWDxBp79B",
        "Referer": "https://prip.pharma-dept.gov.in/project/59e3d6ed-ac6a-431d-967a-67bb7c228d55"
    }
};

/**
 * Get configuration with optional overrides
 */
export function getConfig(overrides?: Partial<LoadTestConfig>): LoadTestConfig {
    return { ...loadTestConfig, ...overrides };
}
