import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SysPreference } from 'picsur-shared/dist/dto/sys-preferences.enum';
import {
  AsyncFailable,
  Fail,
  FT,
  HasFailed,
  ThrowIfFailed,
} from 'picsur-shared/dist/types/failable';
import { ParseString } from 'picsur-shared/dist/util/parse-simple';
import { EnvPrefix } from '../../config/config.static.js';
import { SysPreferenceDbService } from '../../collections/preference-db/sys-preference-db.service.js';

export interface OidcConfig {
  enabled: boolean;
  issuer: string;
  clientId: string;
  clientSecret: string;
  autoLinkByEmail: boolean;
  disableBuiltinAuth: boolean;
  providerName: string;
}

@Injectable()
export class OidcConfigService {
  private readonly logger = new Logger(OidcConfigService.name);
  private cachedConfig: OidcConfig | null = null;
  private configLoadTime = 0;
  private readonly CONFIG_CACHE_TTL = 60000;

  constructor(
    private readonly configService: ConfigService,
    private readonly prefService: SysPreferenceDbService,
  ) {}

  async getOidcConfig(): Promise<AsyncFailable<OidcConfig>> {
    if (
      this.cachedConfig &&
      Date.now() - this.configLoadTime < this.CONFIG_CACHE_TTL
    ) {
      return (
        this.cachedConfig ?? Fail(FT.Internal, 'Failed to load OIDC config')
      );
    }

    const envEnabled = ParseString(
      this.configService.get(`${EnvPrefix}OIDC_ENABLED`),
    );
    const envIssuer = ParseString(
      this.configService.get(`${EnvPrefix}OIDC_ISSUER`),
    );
    const envClientId = ParseString(
      this.configService.get(`${EnvPrefix}OIDC_CLIENT_ID`),
    );
    const envClientSecret = ParseString(
      this.configService.get(`${EnvPrefix}OIDC_CLIENT_SECRET`),
    );
    const envAutoLink = ParseString(
      this.configService.get(`${EnvPrefix}OIDC_AUTO_LINK_BY_EMAIL`),
    );
    const envDisableBuiltin = ParseString(
      this.configService.get(`${EnvPrefix}DISABLE_BUILTIN_AUTH`),
    );
    const envProviderName = ParseString(
      this.configService.get(`${EnvPrefix}OIDC_PROVIDER_NAME`),
    );

    const enabled = envEnabled
      ? envEnabled.toLowerCase() === 'true'
      : ThrowIfFailed(
          await this.prefService.getBooleanPreference(
            SysPreference.OidcEnabled,
          ),
        );
    const issuer =
      envIssuer ??
      ThrowIfFailed(
        await this.prefService.getStringPreference(SysPreference.OidcIssuer),
      );
    const clientId =
      envClientId ??
      ThrowIfFailed(
        await this.prefService.getStringPreference(SysPreference.OidcClientId),
      );
    const clientSecret =
      envClientSecret ??
      ThrowIfFailed(
        await this.prefService.getStringPreference(
          SysPreference.OidcClientSecret,
        ),
      );
    const autoLinkByEmail = envAutoLink
      ? envAutoLink.toLowerCase() === 'true'
      : ThrowIfFailed(
          await this.prefService.getBooleanPreference(
            SysPreference.OidcAutoLinkByEmail,
          ),
        );
    const disableBuiltinAuth = envDisableBuiltin
      ? envDisableBuiltin.toLowerCase() === 'true'
      : ThrowIfFailed(
          await this.prefService.getBooleanPreference(
            SysPreference.DisableBuiltinAuth,
          ),
        );

    let providerName = envProviderName ?? 'OIDC';
    if (!envProviderName) {
      const storedProviderName = await this.prefService.getStringPreference(
        SysPreference.OidcProviderName,
      );
      if (HasFailed(storedProviderName) === false && storedProviderName) {
        providerName = storedProviderName;
      }
    }

    this.cachedConfig = {
      enabled,
      issuer,
      clientId,
      clientSecret,
      autoLinkByEmail,
      disableBuiltinAuth,
      providerName,
    };
    this.configLoadTime = Date.now();

    this.logger.debug(
      `OIDC config loaded: enabled=${enabled}, issuer=${issuer}, clientId=${clientId}, autoLink=${autoLinkByEmail}, disableBuiltin=${disableBuiltinAuth}`,
    );

    return this.cachedConfig;
  }

  clearCache(): void {
    this.cachedConfig = null;
    this.configLoadTime = 0;
  }

  async isOidcEnabled(): Promise<boolean> {
    const config = await this.getOidcConfig();
    if (HasFailed(config)) return false;
    return config.enabled;
  }

  async isBuiltinAuthDisabled(): Promise<boolean> {
    const config = await this.getOidcConfig();
    if (HasFailed(config)) return false;
    return config.disableBuiltinAuth;
  }
}
