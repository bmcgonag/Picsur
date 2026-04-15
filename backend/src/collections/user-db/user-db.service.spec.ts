import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserDbService } from './user-db.service';
import { RoleDbService } from '../../collections/role-db/role-db.service';
import { SysPreferenceDbService } from '../../collections/preference-db/sys-preference-db.service';
import { EUserBackend } from '../../database/entities/users/user.entity';
import { HasFailed, HasSuccess } from 'picsur-shared/dist/types/failable';

describe('UserDbService', () => {
  let service: UserDbService;
  let mockRepository: Partial<Repository<EUserBackend>>;
  let mockRoleService: Partial<RoleDbService>;
  let mockPrefService: Partial<SysPreferenceDbService>;

  const mockUser: any = {
    id: 'test-uuid',
    username: 'testuser',
    hashed_password: '$2b$12$hashedpassword',
    roles: ['user'],
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      save: jest
        .fn()
        .mockImplementation((user) =>
          Promise.resolve({ ...user, id: 'test-uuid' }),
        ),
      remove: jest.fn().mockResolvedValue(mockUser),
      findOne: jest.fn().mockResolvedValue(mockUser),
      findAndCount: jest.fn().mockResolvedValue([[mockUser], 1]),
      count: jest.fn().mockResolvedValue(1),
      createQueryBuilder: jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue({ affected: 1 }),
      }),
    };

    mockRoleService = {
      getPermissions: jest.fn().mockResolvedValue(['view', 'upload']),
    };

    mockPrefService = {
      getNumberPreference: jest.fn().mockResolvedValue(12),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserDbService,
        {
          provide: getRepositoryToken(EUserBackend),
          useValue: mockRepository,
        },
        {
          provide: RoleDbService,
          useValue: mockRoleService,
        },
        {
          provide: SysPreferenceDbService,
          useValue: mockPrefService,
        },
      ],
    }).compile();

    service = module.get<UserDbService>(UserDbService);
  });

  describe('create', () => {
    it('should create a new user', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValueOnce(null);

      const result = await service.create('newuser', 'password123');

      expect(HasSuccess(result)).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail if user already exists', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValueOnce(mockUser);

      const result = await service.create('testuser', 'password123');

      expect(HasFailed(result)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return user by id', async () => {
      const result = await service.findOne('test-uuid');

      expect(HasSuccess(result)).toBe(true);
      expect((result as any).username).toBe('testuser');
    });

    it('should return NotFound for non-existent user', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValueOnce(null);

      const result = await service.findOne('nonexistent-uuid');

      expect(HasFailed(result)).toBe(true);
    });
  });

  describe('findMany', () => {
    it('should return paginated users', async () => {
      const result = await service.findMany(10, 0);

      expect(HasSuccess(result)).toBe(true);
      expect((result as any).total).toBe(1);
      expect((result as any).page).toBe(0);
    });

    it('should fail with invalid page parameters', async () => {
      const result = await service.findMany(0, 0);

      expect(HasFailed(result)).toBe(true);
    });

    it('should fail when count exceeds 100', async () => {
      const result = await service.findMany(101, 0);

      expect(HasFailed(result)).toBe(true);
    });
  });

  describe('checkUsername', () => {
    it('should return available true when username not found', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValueOnce(null);

      const result = await service.checkUsername('newuser');

      expect(HasSuccess(result)).toBe(true);
      expect((result as any).available).toBe(true);
    });

    it('should return available false when username exists', async () => {
      const result = await service.checkUsername('testuser');

      expect(HasSuccess(result)).toBe(true);
      expect((result as any).available).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when user exists', async () => {
      const result = await service.exists('testuser');
      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValueOnce(null);

      const result = await service.exists('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      const result = await service.delete('test-uuid');

      expect(HasSuccess(result)).toBe(true);
      expect(mockRepository.remove).toHaveBeenCalled();
    });

    it('should fail to delete system user', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValueOnce({
        ...mockUser,
        username: 'admin',
      });

      const result = await service.delete('test-uuid');

      expect(HasFailed(result)).toBe(true);
    });
  });
});
