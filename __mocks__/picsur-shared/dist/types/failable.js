export const FT = {
  Unknown: 'unknown',
  Database: 'database',
  SysValidation: 'sysvalidation',
  UsrValidation: 'usrvalidation',
  BadRequest: 'badrequest',
  Permission: 'permission',
  RateLimit: 'ratelimit',
  NotFound: 'notfound',
  RouteNotFound: 'routenotfound',
  Conflict: 'conflict',
  Internal: 'internal',
  Authentication: 'authentication',
  Impossible: 'impossible',
  Network: 'network',
};

class Failure {
  constructor(
    private readonly type,
    private readonly reason,
  ) {}

  getReason() { return this.reason ?? 'Unknown'; }
  getType() { return this.type; }
  getCode() {
    const codes = {
      unknown: 500, database: 500, sysvalidation: 500, internal: 500, network: 500,
      usrvalidation: 400, badrequest: 400, permission: 403, ratelimit: 429,
      notfound: 404, routenotfound: 404, conflict: 409, authentication: 200, impossible: 422,
    };
    return codes[this.type] || 500;
  }
  failed = true;
  getOrNull() { return null; }
}

class Success {
  constructor(value) {
    this.failed = false;
    this._value = value;
  }
  getOrNull() { return this._value; }
}

export function Fail(type, reason) {
  return new Failure(type, reason);
}

export function HasFailed(value) {
  if (value instanceof Failure) return true;
  if (value && typeof value === 'object' && 'failed' in value) return value.failed;
  return false;
}

export function HasSuccess(value) {
  return !HasFailed(value);
}

export function Open(failable, key) {
  if (HasFailed(failable)) return failable;
  return failable[key];
}

export function makeUnique(arr) {
  return [...new Set(arr)];
}
