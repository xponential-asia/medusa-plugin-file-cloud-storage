import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**.test.ts'],
  collectCoverageFrom: ['<rootDir>/src/**/*.ts', '!<rootDir>/src/**/index.ts'],
  /* TODO: Increase when ready to do coverage */
  coverageThreshold: {
    global: {
      statements: 54.57,
      branches: 6.89,
      functions: 11.67,
      lines: 51.84,
    },
  },
};

export default config;
