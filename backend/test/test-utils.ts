import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import * as sharp from 'sharp';
import * as jwt from 'jsonwebtoken';

let container: PostgreSqlContainer | null = null;
let dataSource: DataSource | null = null;

export async function startTestDatabase(): Promise<{
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}> {
  container = await new PostgreSqlContainer().start();

  return {
    host: container.getHost(),
    port: container.getPort(),
    username: container.getUsername(),
    password: container.getPassword(),
    database: container.getDatabase(),
  };
}

export async function getTestDataSource(config: {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
}): Promise<DataSource> {
  if (dataSource) {
    return dataSource;
  }

  dataSource = new DataSource({
    type: 'postgres',
    host: config.host,
    port: config.port,
    username: config.username,
    password: config.password,
    database: config.database,
    entities: ['src/**/*.entity.ts'],
    synchronize: true,
    logging: false,
  });

  await dataSource.initialize();
  return dataSource;
}

export async function stopTestDatabase(): Promise<void> {
  if (dataSource) {
    await dataSource.destroy();
    dataSource = null;
  }
  if (container) {
    await container.stop();
    container = null;
  }
}

export function generateTestImage(
  width = 100,
  height = 100,
  format: 'png' | 'jpg' = 'png',
): Buffer {
  const pixelData = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixelData.length; i += 3) {
    pixelData[i] = Math.floor(Math.random() * 256);
    pixelData[i + 1] = Math.floor(Math.random() * 256);
    pixelData[i + 2] = Math.floor(Math.random() * 256);
  }

  return sharp(pixelData, {
    raw: {
      width,
      height,
      channels: 3,
    },
  })
    [format]()
    .toBuffer();
}

export function generateTestToken(
  payload: Record<string, unknown>,
  secret = 'test-secret',
): string {
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}
