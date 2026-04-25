import { Controller, Get, Logger, Query, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { HasFailed, ThrowIfFailed } from 'picsur-shared/dist/types/failable';
import { OidcService } from '../../../managers/oidc/oidc.service.js';
import { OidcConfigService } from '../../../managers/oidc/oidc-config.service.js';
import { generateRandomString } from 'picsur-shared/dist/util/random';
import { NoPermissions } from '../../../decorators/permissions.decorator.js';
import { ReturnsAnything } from '../../../decorators/returns.decorator.js';
import { HostConfigService } from '../../../config/early/host.config.service.js';

@Controller('api/auth/oidc')
@NoPermissions()
export class OidcController {
  private readonly logger = new Logger(OidcController.name);

  constructor(
    private readonly oidcService: OidcService,
    private readonly oidcConfigService: OidcConfigService,
    private readonly hostConfigService: HostConfigService,
  ) {}

  private getOrigin(req: FastifyRequest): string | undefined {
    const protocol = req.protocol || 'https';
    const host = req.headers?.host;
    if (host) {
      return `${protocol}://${host}`;
    }
    return undefined;
  }

  private getCallbackOrigin(
    req: FastifyRequest,
    _config: { issuer: string },
  ): string {
    const storedOrigin = this.hostConfigService.getOrigin();
    if (storedOrigin) {
      return storedOrigin;
    }
    const referer = req.headers?.referer;
    if (referer) {
      try {
        const url = new URL(referer);
        return `${url.protocol}//${url.host}`;
      } catch {
        return 'https://myimg.routemehome.org';
      }
    }
    return 'https://myimg.routemehome.org';
  }

  @Get('login')
  async login(
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const isEnabled = await this.oidcConfigService.isOidcEnabled();
    if (!isEnabled) {
      res.code(404).send({ error: 'OIDC is not enabled' });
      return;
    }

    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(64);
    const origin = this.getOrigin(req);

    const authUrl = ThrowIfFailed(
      await this.oidcService.getAuthorizationUrl(state, codeVerifier, origin),
    );

    res
      .cookie('oidc_state', state, {
        httpOnly: true,
        sameSite: 'none' as const,
        secure: true,
        maxAge: 600000,
        path: '/',
      })
      .cookie('oidc_code_verifier', codeVerifier, {
        httpOnly: true,
        sameSite: 'none' as const,
        secure: true,
        maxAge: 600000,
        path: '/',
      });

    this.logger.error(`OIDC login redirect to: ${authUrl}`);

    res.redirect(302, authUrl);
  }

  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('cv') codeVerifierQuery: string,
    @Req() req: FastifyRequest,
    @Res() res: FastifyReply,
  ): Promise<void> {
    const rawRequest = req as any;
    const cookies = rawRequest.cookies;
    const cookieState = cookies?.['oidc_state'];
    const codeVerifier = codeVerifierQuery || cookies?.['oidc_code_verifier'];
    const origin = this.getOrigin(req);

    this.logger.error(
      `OIDC callback received: code=${!!code}, state=${!!state}, cookieState=${!!cookieState}, codeVerifier=${!!codeVerifier}, origin=${origin}`,
    );

    const isPopup =
      rawRequest.headers?.accept?.includes('text/html') ||
      rawRequest.headers?.Accept?.includes('text/html');

    if (!code || !state || !cookieState || !codeVerifier) {
      if (isPopup) {
        res
          .type('text/html')
          .send(this.getErrorHtml('Missing required parameters'));
        return;
      }
      res.code(400).send({ error: 'Missing required parameters' });
      return;
    }

    if (state !== cookieState) {
      if (isPopup) {
        res
          .type('text/html')
          .send(this.getErrorHtml('State mismatch - possible CSRF attack'));
        return;
      }
      res.code(400).send({ error: 'State mismatch' });
      return;
    }

    res
      .cookie('oidc_state', '', {
        httpOnly: true,
        sameSite: 'none' as const,
        secure: true,
        maxAge: 0,
        path: '/',
      })
      .cookie('oidc_code_verifier', '', {
        httpOnly: true,
        sameSite: 'none' as const,
        secure: true,
        maxAge: 0,
        path: '/',
      });

    try {
      const result = ThrowIfFailed(
        await this.oidcService.handleCallback(
          state,
          code,
          codeVerifier,
          origin,
        ),
      );

      this.logger.error(`OIDC auth successful, isPopup=${isPopup}`);

      res
        .type('text/html')
        .send(this.getSuccessHtml(result.token, result.isNewUser));
      return;
    } catch (e) {
      this.logger.error(`OIDC callback error: ${e}`);
      if (isPopup) {
        res.type('text/html').send(this.getErrorHtml('Authentication failed'));
        return;
      }
      res.code(401).send({ error: 'OIDC authentication failed' });
    }
  }

  private getSuccessHtml(token: string, isNewUser: boolean): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>OIDC Login</title>
</head>
<body>
<script>
  console.log('=== POPUP DEBUG ===');
  console.log('Popup origin:', window.location.origin);

  var target = window.opener || window.parent;
  var postMessageWorked = false;

  if (target && target !== window) {
    try {
      target.postMessage({
        type: 'oidc-success',
        token: '${token}',
        isNewUser: ${isNewUser}
      }, window.location.origin);
      postMessageWorked = true;
      console.log('postMessage sent');
    } catch (e) {
      console.log('postMessage failed:', e.message);
    }
  }

  if (!postMessageWorked) {
    console.log('postMessage did not work, using BroadcastChannel');

    try {
      var bc = new BroadcastChannel('oidc-auth');
      bc.postMessage({
        type: 'oidc-success',
        token: '${token}',
        isNewUser: ${isNewUser}
      });
      console.log('BroadcastChannel message sent');
      bc.close();
    } catch (e) {
      console.log('BroadcastChannel failed:', e.message);
      console.log('Fallback: reload main window with token');

      setTimeout(function() {
        if (window.opener && !window.opener.closed) {
          window.opener.location.href = '/?oidc-token=' + encodeURIComponent('${token}');
        } else {
          window.location.href = '/?oidc-token=' + encodeURIComponent('${token}');
        }
      }, 1000);
    }
  }

  console.log('Closing popup');
  setTimeout(function() {
    window.close();
  }, 1000);
</script>
<p style="font-size: 20px; font-weight: bold;">OIDC Login Successful!</p>
<p>Token received! Window will close shortly...</p>
</body>
</html>`;
  }

  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>OIDC Login Error</title>
</head>
<body>
<script>
  var target = window.opener || window.parent;
  var postMessageWorked = false;

  if (target && target !== window) {
    try {
      target.postMessage({
        type: 'oidc-error',
        error: '${message}'
      }, window.location.origin);
      postMessageWorked = true;
    } catch (e) {
      console.log('postMessage failed:', e.message);
    }
  }

  if (!postMessageWorked) {
    try {
      var bc = new BroadcastChannel('oidc-auth');
      bc.postMessage({
        type: 'oidc-error',
        error: '${message}'
      });
      bc.close();
    } catch (e) {
      console.log('BroadcastChannel failed:', e.message);
      alert('OIDC Error: ${message}');
    }
  }
</script>
<p style="font-size: 20px; font-weight: bold; color: red;">OIDC Login Failed</p>
<p>${message}</p>
</body>
</html>`;
  }

  @Get('config')
  @ReturnsAnything()
  async getConfig(): Promise<{
    enabled: boolean;
    disableBuiltinAuth: boolean;
    providerName: string;
  }> {
    const config = await this.oidcConfigService.getOidcConfig();
    if (HasFailed(config)) {
      return {
        enabled: false,
        disableBuiltinAuth: false,
        providerName: 'OIDC',
      };
    }
    return {
      enabled: config.enabled,
      disableBuiltinAuth: config.disableBuiltinAuth,
      providerName: config.providerName,
    };
  }
}
