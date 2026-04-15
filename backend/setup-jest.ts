import 'reflect-metadata';

beforeAll(async () => {
  jest.setTimeout(120000);
});

afterAll(async () => {
  jest.clearAllMocks();
});
