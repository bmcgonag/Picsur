import type { Config } from 'jest';

const mockBase = '<rootDir>/../../__mocks__/picsur-shared';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.test.json',
      },
    ],
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^picsur-shared$': mockBase + '/index.js',
    '^picsur-shared/dist/types/(.*)$': mockBase + '/dist/types/$1.js',
    '^picsur-shared/dist/dto/(.*)$': mockBase + '/dist/dto/$1.js',
    '^picsur-shared/dist/util/(.*)$': mockBase + '/dist/util/$1.js',
    '^picsur-shared/dist/entities/(.*)$': mockBase + '/dist/entities/$1.js',
    '^bcrypt-ts$': '<rootDir>/__mocks__/bcrypt-ts.js',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  setupFilesAfterEnv: ['<rootDir>/../setup-jest.ts'],
};

export default config;
