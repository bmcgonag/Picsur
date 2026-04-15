import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt-ts';

import { AppModule } from '../src/app.module.js';
import { EUserBackend } from '../src/database/entities/users/user.entity.js';
import { ERoleBackend } from '../src/database/entities/users/role.entity.js';

describe('API E2E Tests', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let adminToken: string;
  let _userToken: string;
  let _adminUserId: string;

  beforeAll(async () => {
    jest.setTimeout(180000);

    const container = await new PostgreSqlContainer().start();

    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      entities: ['src/**/*.entity.ts'],
      synchronize: true,
      logging: false,
    });

    await dataSource.initialize();

    const hashedPassword = await bcrypt.hash('adminpassword', 12);
    const adminRole = dataSource.getRepository(ERoleBackend).create({
      name: 'admin',
      permissions: ['view', 'upload', 'delete', 'admin'],
    });
    await dataSource.getRepository(ERoleBackend).save(adminRole);

    const adminUser = dataSource.getRepository(EUserBackend).create({
      username: 'admin',
      hashed_password: hashedPassword,
      roles: ['admin'],
    });
    const savedAdmin = await dataSource
      .getRepository(EUserBackend)
      .save(adminUser);
    adminUserId = savedAdmin.id;

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: container.getHost(),
          port: container.getPort(),
          username: container.getUsername(),
          password: container.getPassword(),
          database: container.getDatabase(),
          entities: ['src/**/*.entity.ts'],
          synchronize: true,
          logging: false,
        }),
        AppModule,
        JwtModule.register({
          global: true,
          secret: 'test-secret-key',
          signOptions: { expiresIn: '1h' },
        }),
        PassportModule,
      ],
    }).compile();

    app = module.createNestApplication(new FastifyAdapter());
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  }, 180000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (dataSource) {
      await dataSource.destroy();
    }
  });

  describe('Health Check', () => {
    it('should get API info', async () => {
      const response = await request(app.getHttpServer()).get('/api/info');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('statusCode', 200);
      expect(response.body).toHaveProperty('data');
    });
  });

  describe('Authentication', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/login')
        .send({
          username: 'admin',
          password: 'adminpassword',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('token');
      adminToken = response.body.data.token;
    });

    it('should fail with invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/login')
        .send({
          username: 'admin',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
    });

    it('should fail with non-existent user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/login')
        .send({
          username: 'nonexistent',
          password: 'password',
        });

      expect(response.status).toBe(401);
    });

    it('should get current user info', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/user/me')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('username', 'admin');
    });

    it('should fail without auth token', async () => {
      const response = await request(app.getHttpServer()).get('/api/user/me');

      expect(response.status).toBe(401);
    });
  });

  describe('User Management', () => {
    it('should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/register')
        .send({
          username: 'testuser',
          password: 'testpassword123',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('username', 'testuser');
    });

    it('should check username availability', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/user/check/testuser',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('available', false);
    });

    it('should check available username', async () => {
      const response = await request(app.getHttpServer()).get(
        '/api/user/check/newusername12345',
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('available', true);
    });

    it('should fail registering duplicate user', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/user/register')
        .send({
          username: 'testuser',
          password: 'testpassword123',
        });

      expect(response.status).toBe(409);
    });
  });

  describe('Roles', () => {
    it('should get all roles', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should get role by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/roles/admin')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('name', 'admin');
    });
  });

  describe('Image Upload', () => {
    it('should upload an image', async () => {
      const buffer = Buffer.from(
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        'base64',
      );

      const response = await request(app.getHttpServer())
        .post('/api/image')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', buffer, {
          filename: 'test.png',
          contentType: 'image/png',
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('uuid');
    });

    it('should get image info', async () => {
      await request(app.getHttpServer()).get('/i/info/test').expect(200);
    });
  });

  describe('System Preferences', () => {
    it('should get all system preferences', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/syspref')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('data');
    });
  });
});
