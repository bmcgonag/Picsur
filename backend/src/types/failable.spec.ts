import {
  FT,
  Fail,
  HasFailed,
  HasSuccess,
} from 'picsur-shared/dist/types/failable';

describe('Failable Type', () => {
  describe('Success case', () => {
    it('should create a successful result', () => {
      const result = { failed: false, value: 'test' };
      expect(HasSuccess(result)).toBe(true);
      expect(HasFailed(result)).toBe(false);
    });

    it('should return value', () => {
      const result = { failed: false, value: 'test' };
      expect(result.value).toBe('test');
    });
  });

  describe('Failure case', () => {
    it('should create a failed result', () => {
      const result = Fail(FT.NotFound, 'Not found');
      expect(HasFailed(result)).toBe(true);
      expect(HasSuccess(result)).toBe(false);
    });

    it('should have getReason method', () => {
      const result = Fail(FT.NotFound, 'Not found');
      expect(typeof result.getReason).toBe('function');
    });

    it('should return correct failure type', () => {
      const result = Fail(FT.Authentication, 'Auth failed');
      expect(result.getType()).toBe(FT.Authentication);
    });

    it('should return correct failure message', () => {
      const result = Fail(FT.Database, 'DB error');
      expect(result.getReason()).toBe('DB error');
    });

    it('should have getCode method', () => {
      const result = Fail(FT.NotFound, 'Not found');
      expect(result.getCode()).toBe(404);
    });
  });

  describe('Failure types', () => {
    it('should support NotFound type', () => {
      const result = Fail(FT.NotFound, 'Resource not found');
      expect(result.getType()).toBe(FT.NotFound);
    });

    it('should support Conflict type', () => {
      const result = Fail(FT.Conflict, 'Already exists');
      expect(result.getType()).toBe(FT.Conflict);
    });

    it('should support Permission type', () => {
      const result = Fail(FT.Permission, 'Access denied');
      expect(result.getType()).toBe(FT.Permission);
    });

    it('should support Database type', () => {
      const result = Fail(FT.Database, 'Query failed');
      expect(result.getType()).toBe(FT.Database);
    });

    it('should return correct HTTP status codes', () => {
      expect(Fail(FT.NotFound, '').getCode()).toBe(404);
      expect(Fail(FT.BadRequest, '').getCode()).toBe(400);
      expect(Fail(FT.Permission, '').getCode()).toBe(403);
      expect(Fail(FT.Authentication, '').getCode()).toBe(200);
    });
  });

  describe('HasFailed and HasSuccess helpers', () => {
    it('HasFailed should return true for Failure', () => {
      const result = Fail(FT.NotFound, 'Not found');
      expect(HasFailed(result)).toBe(true);
    });

    it('HasSuccess should return false for Failure', () => {
      const result = Fail(FT.NotFound, 'Not found');
      expect(HasSuccess(result)).toBe(false);
    });
  });
});
