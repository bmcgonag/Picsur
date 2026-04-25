import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { FT, Fail } from 'picsur-shared/dist/types/failable';
import { OidcConfigService } from '../../../managers/oidc/oidc-config.service.js';

@Injectable()
export class DisableBuiltinAuthGuard implements CanActivate {
  private readonly logger = new Logger(DisableBuiltinAuthGuard.name);

  constructor(private readonly oidcConfigService: OidcConfigService) {}

  async canActivate(_context: ExecutionContext): Promise<boolean> {
    const isDisabled = await this.oidcConfigService.isBuiltinAuthDisabled();
    if (!isDisabled) {
      return true;
    }

    const isOidcEnabled = await this.oidcConfigService.isOidcEnabled();
    if (!isOidcEnabled) {
      this.logger.warn(
        'Builtin auth is disabled but OIDC is not enabled - blocking all auth',
      );
      throw Fail(
        FT.Permission,
        'Authentication is not configured on this server',
      );
    }

    this.logger.debug('Builtin auth is disabled, blocking request');
    throw Fail(
      FT.Permission,
      'Built-in authentication is disabled, please use SSO/OAuth',
    );
  }
}
