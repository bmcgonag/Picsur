import { TestBed } from '@angular/core/testing';
import { KeyStorageService } from './key-storage.service';

describe('KeyStorageService', () => {
  let service: KeyStorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [KeyStorageService],
    });
    service = TestBed.inject(KeyStorageService);

    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('get', () => {
    it('should return null when no key is stored', () => {
      const result = service.get();
      expect(result).toBeNull();
    });

    it('should return stored key', () => {
      service.set('test-key');
      const result = service.get();
      expect(result).toBe('test-key');
    });
  });

  describe('set', () => {
    it('should store the key', () => {
      service.set('new-key');
      expect(localStorage.getItem('apiKey')).toBe('new-key');
    });

    it('should overwrite existing key', () => {
      service.set('key1');
      service.set('key2');
      expect(service.get()).toBe('key2');
    });
  });

  describe('clear', () => {
    it('should remove the key', () => {
      service.set('test-key');
      service.clear();
      expect(service.get()).toBeNull();
    });

    it('should not throw when no key exists', () => {
      expect(() => service.clear()).not.toThrow();
    });
  });
});
