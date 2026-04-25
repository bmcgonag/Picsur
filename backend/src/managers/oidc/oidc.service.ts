import { Injectable, Logger } from '@nestjs/common';
import * as client from 'openid-client';
import { EUser } from 'picsur-shared/dist/entities/user.entity';
import {
  AsyncFailable,
  Fail,
  FT,
  HasFailed,
  HasSuccess,
} from 'picsur-shared/dist/types/failable';
import { UserDbService } from '../../collections/user-db/user-db.service.js';
import { OidcConfigService } from './oidc-config.service.js';
import { AuthManagerService } from '../auth/auth.service.js';
import { DefaultRolesList } from '../../models/constants/roles.const.js';
import { HostConfigService } from '../../config/early/host.config.service.js';

export interface OidcUserInfo {
  sub: string;
  email?: string;
  name?: string;
  preferredUsername?: string;
}

export interface OidcAuthResult {
  user: EUser;
  token: string;
  isNewUser: boolean;
  needsManualLink?: boolean;
}

@Injectable()
export class OidcService {
  private readonly logger = new Logger(OidcService.name);
  private config: client.Configuration | null = null;
  private configInitTime = 0;
  private readonly CONFIG_CACHE_TTL = 3600000;

  constructor(
    private readonly oidcConfigService: OidcConfigService,
    private readonly usersService: UserDbService,
    private readonly authService: AuthManagerService,
    private readonly hostConfigService: HostConfigService,
  ) {}

  private async getConfig(): Promise<AsyncFailable<client.Configuration>> {
    if (
      this.config &&
      Date.now() - this.configInitTime < this.CONFIG_CACHE_TTL
    ) {
      return this.config;
    }

    const oidcConfig = await this.oidcConfigService.getOidcConfig();
    if (HasFailed(oidcConfig)) return oidcConfig;

    if (
      !oidcConfig.enabled ||
      !oidcConfig.issuer ||
      !oidcConfig.clientId ||
      !oidcConfig.clientSecret
    ) {
      return Fail(FT.SysValidation, 'OIDC is not properly configured');
    }

    try {
      const iss = new URL(oidcConfig.issuer);
      this.config = await client.discovery(
        iss,
        oidcConfig.clientId,
        oidcConfig.clientSecret,
      );
      this.configInitTime = Date.now();
      this.logger.log(
        `OIDC config initialized for issuer: ${oidcConfig.issuer}`,
      );
      return this.config;
    } catch (e) {
      this.logger.error(`Failed to initialize OIDC config: ${e}`);
      return Fail(FT.SysValidation, `Failed to initialize OIDC config: ${e}`);
    }
  }

  async getAuthorizationUrl(
    state: string,
    codeVerifier: string,
    requestOrigin?: string,
  ): Promise<AsyncFailable<string>> {
    const config = await this.getConfig();
    if (HasFailed(config)) return config;

    const redirectUri = this.getRedirectUri(requestOrigin);
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const url = client.buildAuthorizationUrl(config, {
      redirect_uri: redirectUri,
      scope: 'openid email profile',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return url.toString();
  }

  private getRedirectUri(requestOrigin?: string): string {
    const origin = this.hostConfigService.getOrigin() ?? requestOrigin;
    const uri = origin
      ? `${origin}/api/auth/oidc/callback`
      : '/api/auth/oidc/callback';
    this.logger.error(
      `getRedirectUri: ORIGIN env=${this.hostConfigService.getOrigin()}, requestOrigin=${requestOrigin}, uri=${uri}`,
    );
    return uri;
  }

  private getTokenExchangeUri(requestOrigin?: string): string {
    const origin = this.hostConfigService.getOrigin() ?? requestOrigin;
    return origin
      ? `${origin}/api/auth/oidc/callback`
      : '/api/auth/oidc/callback';
  }

  async handleCallback(
    state: string,
    code: string,
    codeVerifier: string,
    requestOrigin?: string,
  ): Promise<AsyncFailable<OidcAuthResult>> {
    const config = await this.getConfig();
    if (HasFailed(config)) return config;

    const redirectUri = this.getTokenExchangeUri(requestOrigin);
    this.logger.error(
      `Token exchange: redirect_uri=${redirectUri}, code_len=${code?.length}, verifier_len=${codeVerifier?.length}`,
    );

    try {
      const currentUrl = new URL(redirectUri, 'http://localhost');
      currentUrl.searchParams.set('code', code);
      currentUrl.searchParams.set('state', state);
      this.logger.error(`Token exchange URL: ${currentUrl.toString()}`);

      const oidcConfig = await this.oidcConfigService.getOidcConfig();
      const clientId = HasFailed(oidcConfig) ? '' : oidcConfig.clientId;
      const issuerUrl =
        (config as any).issuer ||
        (config as any).issuerUrl ||
        'https://auth.routemehome.org/application/o/picsur/';
      this.logger.error(`Issuer URL: ${issuerUrl}`);

      const openidConfigUrl = `${issuerUrl.replace(/\/$/, '')}/.well-known/openid-configuration`;
      this.logger.error(`OpenID config URL: ${openidConfigUrl}`);

      let tokenEndpoint =
        (config as any).issuer?.metadata?.token_endpoint ||
        (config as any).metadata?.token_endpoint;
      this.logger.error(`Token endpoint from config: ${tokenEndpoint}`);

      if (!tokenEndpoint) {
        try {
          const openidResp = await fetch(openidConfigUrl);
          const openidData = (await openidResp.json()) as {
            token_endpoint?: string;
          };
          tokenEndpoint = openidData.token_endpoint;
          this.logger.error(
            `Token endpoint from OIDC discovery: ${tokenEndpoint}`,
          );
        } catch (e) {
          this.logger.error(`Failed to fetch OIDC discovery: ${e}`);
        }
      }

      const httpResponse = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
          client_id: clientId,
        }),
      });
      const responseText = await httpResponse.text();
      this.logger.error(`Token HTTP status: ${httpResponse.status}`);

      if (!httpResponse.ok) {
        return Fail(
          FT.Authentication,
          `Token exchange failed: ${responseText}`,
        );
      }

      const tokenData = JSON.parse(responseText);
      const claims = this.decodeJwtPayload(tokenData.id_token);
      if (!claims) {
        return Fail(FT.Authentication, 'No claims in token response');
      }

      const userInfo: OidcUserInfo = {
        sub: claims['sub'] as string,
        email: claims['email'] as string | undefined,
        name: claims['name'] as string | undefined,
        preferredUsername: claims['preferred_username'] as string | undefined,
      };

      return await this.findOrCreateUser(userInfo);
    } catch (e) {
      this.logger.error(
        `OIDC callback failed: ${e} | Stack: ${(e as Error)?.stack}`,
      );
      return Fail(FT.Authentication, `OIDC callback failed: ${e}`);
    }
  }

  private async findOrCreateUser(
    userInfo: OidcUserInfo,
  ): Promise<AsyncFailable<OidcAuthResult>> {
    let user = await this.usersService.findByExternalId(userInfo.sub);
    if (HasSuccess(user)) {
      const token = await this.authService.createToken(user);
      if (HasFailed(token)) return token;
      return { user, token, isNewUser: false };
    }

    const config = await this.oidcConfigService.getOidcConfig();
    if (HasFailed(config)) return config;

    if (userInfo.email && config.autoLinkByEmail) {
      const existingUser = await this.usersService.findByEmail(userInfo.email);
      if (HasSuccess(existingUser)) {
        this.logger.log(
          `Auto-linking OIDC user ${userInfo.sub} to existing user ${existingUser.username}`,
        );
        const updateResult = await this.usersService.setExternalId(
          existingUser.id,
          userInfo.sub,
        );
        if (HasFailed(updateResult)) {
          this.logger.error(
            `Failed to set external ID: ${updateResult.getReason()}`,
          );
        }
        if (userInfo.email && !existingUser.email) {
          await this.usersService.setEmail(existingUser.id, userInfo.email);
        }
        const updatedUser = await this.usersService.findOne(existingUser.id);
        if (HasFailed(updatedUser)) return updatedUser;
        const token = await this.authService.createToken(updatedUser);
        if (HasFailed(token)) return token;
        return { user: updatedUser, token, isNewUser: false };
      }
    }

    const username =
      userInfo.preferredUsername ||
      userInfo.name ||
      userInfo.email?.split('@')[0] ||
      `oidc_${userInfo.sub.substring(0, 8)}`;
    const finalUsername = await this.ensureUniqueUsername(username);

    const newUser = await this.usersService.createWithExternalId(
      finalUsername,
      userInfo.sub,
      DefaultRolesList,
      userInfo.email,
    );
    if (HasFailed(newUser)) return newUser;

    this.logger.log(
      `Created new OIDC user: ${finalUsername} (${userInfo.sub})`,
    );

    const token = await this.authService.createToken(newUser);
    if (HasFailed(token)) return token;

    return {
      user: newUser,
      token,
      isNewUser: true,
      needsManualLink: !config.autoLinkByEmail,
    };
  }

  private async ensureUniqueUsername(baseUsername: string): Promise<string> {
    let username = baseUsername;
    let counter = 1;
    while (await this.usersService.exists(username)) {
      username = `${baseUsername}_${counter}`;
      counter++;
    }
    return username;
  }

  clearConfigCache(): void {
    this.config = null;
    this.configInitTime = 0;
  }

  private decodeJwtPayload(token: string): Record<string, unknown> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = parts[1];
      const decoded = Buffer.from(payload, 'base64url').toString('utf-8');
      return JSON.parse(decoded);
    } catch {
      return null;
    }
  }
}
