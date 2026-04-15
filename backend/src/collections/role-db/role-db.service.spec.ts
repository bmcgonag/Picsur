import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleDbService } from './role-db.service';
import { ERoleBackend } from '../../database/entities/users/role.entity';
import { Permission } from 'picsur-shared/dist/dto/permissions.enum';
import { HasFailed, HasSuccess } from 'picsur-shared/dist/types/failable';

describe('RoleDbService', () => {
  let service: RoleDbService;
  let mockRepository: Partial<Repository<ERoleBackend>>;

  const mockRole: any = {
    name: 'user',
    permissions: [Permission.ImageView, Permission.ImageUpload],
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    mockRepository = {
      save: jest.fn().mockImplementation((role) => Promise.resolve(role)),
      remove: jest.fn().mockResolvedValue(mockRole),
      findOne: jest.fn().mockResolvedValue(mockRole),
      find: jest.fn().mockResolvedValue([mockRole]),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleDbService,
        {
          provide: getRepositoryToken(ERoleBackend),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RoleDbService>(RoleDbService);
  });

  describe('create', () => {
    it('should create a new role', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValueOnce(null);

      const result = await service.create('moderator', [
        Permission.ImageView,
        Permission.ImageUpload,
        Permission.ImageDeleteKey,
      ]);

      expect(HasSuccess(result)).toBe(true);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should fail if role already exists', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValueOnce(mockRole);

      const result = await service.create('user', [Permission.ImageView]);

      expect(HasFailed(result)).toBe(true);
    });
  });

  describe('findOne', () => {
    it('should return role by name', async () => {
      const result = await service.findOne('user');

      expect(HasSuccess(result)).toBe(true);
      expect((result as any).name).toBe('user');
    });

    it('should return NotFound for non-existent role', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValueOnce(null);

      const result = await service.findOne('nonexistent');

      expect(HasFailed(result)).toBe(true);
    });
  });

  describe('findMany', () => {
    it('should return roles by names', async () => {
      const result = await service.findMany(['user', 'admin']);

      expect(HasSuccess(result)).toBe(true);
      expect(mockRepository.find).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should return all roles', async () => {
      const result = await service.findAll();

      expect(HasSuccess(result)).toBe(true);
    });
  });

  describe('exists', () => {
    it('should return true when role exists', async () => {
      const result = await service.exists('user');
      expect(result).toBe(true);
    });

    it('should return false when role does not exist', async () => {
      mockRepository.findOne = jest.fn().mockResolvedValueOnce(null);

      const result = await service.exists('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('getPermissions', () => {
    it('should return combined permissions from roles', async () => {
      mockRepository.find = jest.fn().mockResolvedValueOnce([
        {
          name: 'user',
          permissions: [Permission.ImageView, Permission.ImageUpload],
        },
        {
          name: 'moderator',
          permissions: [Permission.ImageView, Permission.ImageDeleteKey],
        },
      ]);

      const result = await service.getPermissions(['user', 'moderator']);

      expect(HasSuccess(result)).toBe(true);
      const permissions = result as any;
      expect(permissions).toContain(Permission.ImageView);
      expect(permissions).toContain(Permission.ImageUpload);
      expect(permissions).toContain(Permission.ImageDeleteKey);
    });
  });
});
