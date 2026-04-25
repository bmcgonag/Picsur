import { Component, OnInit, HostListener } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AutoUnsubscribe } from 'ngx-auto-unsubscribe-decorator';
import { Permission } from 'picsur-shared/dist/dto/permissions.enum';
import { HasFailed } from 'picsur-shared/dist/types/failable';
import { LoginControl } from '../../../models/forms/login.control';
import { PermissionService } from '../../../services/api/permission.service';
import { UserPassModel } from '../../../models/forms-dto/userpass.dto';
import { UserService } from '../../../services/api/user.service';
import { Logger } from '../../../services/logger/logger.service';
import { ErrorService } from '../../../util/error-manager/error.service';
import { KeyStorageService } from '../../../services/storage/key-storage.service';

@Component({
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  private readonly logger = new Logger(LoginComponent.name);
  private bc: BroadcastChannel | null = null;

  public showRegister = false;
  public showOidcLogin = false;
  public oidcProviderName = 'OIDC';
  public loading = false;
  public disableBuiltinAuth = false;
  public useBuiltinAuth = false;

  public readonly model = new LoginControl();

  constructor(
    private readonly userService: UserService,
    private readonly permissionService: PermissionService,
    private readonly keyStorageService: KeyStorageService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    private readonly errorService: ErrorService,
  ) {}

  ngOnInit(): void {
    const state = history.state as UserPassModel;
    if (state) {
      this.model.putData(state);
      history.replaceState(null, '');
    }

    this.route.queryParams.subscribe((params) => {
      if (params['oidc-token']) {
        this.handleOidcToken(params['oidc-token']);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { 'oidc-token': null },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      }
    });

    this.setupBroadcastChannel();
    this.onPermissions();
    this.checkOidcConfig();
  }

  private setupBroadcastChannel() {
    try {
      this.bc = new BroadcastChannel('oidc-auth');
      this.bc.onmessage = (event) => {
        console.log('BroadcastChannel message received:', event.data);
        if (event.data?.type === 'oidc-success') {
          this.handleOidcToken(event.data.token);
        } else if (event.data?.type === 'oidc-error') {
          this.errorService.error(
            'OIDC Error: ' + event.data.error,
            this.logger,
          );
        }
      };
    } catch (e) {
      this.logger.debug(`BroadcastChannel not supported: ${e}`);
    }
  }

  private handleOidcToken(token: string) {
    console.log('OIDC token received');
    this.keyStorageService.set(token);
    this.errorService.success('OIDC Login successful');
    window.location.href = '/';
  }

  @AutoUnsubscribe()
  onPermissions() {
    return this.permissionService.live.subscribe((permissions) => {
      this.showRegister = permissions.includes(Permission.UserRegister);
    });
  }

  async checkOidcConfig() {
    try {
      const config = await this.userService.getOidcConfig();
      if (HasFailed(config)) {
        this.showOidcLogin = false;
        return;
      }
      this.showOidcLogin = config.enabled;
      this.disableBuiltinAuth = config.disableBuiltinAuth ?? false;
      if (config.providerName) {
        this.oidcProviderName = config.providerName;
      }

      if (this.disableBuiltinAuth && config.enabled) {
        this.useBuiltinAuth = false;
      } else {
        this.useBuiltinAuth = true;
      }
    } catch (e) {
      this.logger.debug(`OIDC config check failed: ${e}`);
      this.showOidcLogin = false;
      this.useBuiltinAuth = true;
    }
  }

  @HostListener('window:message', ['$event'])
  onMessage(event: MessageEvent) {
    console.log('Received message:', event);
    console.log('Event origin:', event.origin);
    console.log('Window location origin:', window.location.origin);
    if (event.origin !== window.location.origin) {
      console.log('Origin mismatch, returning');
      return;
    }

    console.log('Event data:', event.data);
    if (event.data?.type === 'oidc-success') {
      console.log(
        'OIDC success detected, token:',
        event.data.token?.substring(0, 20) + '...',
      );
      this.handleOidcToken(event.data.token);
    } else if (event.data?.type === 'oidc-error') {
      this.errorService.error('OIDC Error: ' + event.data.error, this.logger);
    }
  }

  async onOidcLogin() {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      '/api/auth/oidc/login',
      'oidc-login',
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );
  }

  async onSubmit() {
    const data = this.model.getData();
    if (HasFailed(data)) {
      return;
    }

    this.loading = true;
    const user = await this.userService.login(data.username, data.password);
    this.loading = false;

    if (HasFailed(user))
      return this.errorService.showFailure(user, this.logger);

    this.errorService.success('Login successful');
    this.router.navigate(['/']);
  }

  toggleBuiltinAuth() {
    this.useBuiltinAuth = !this.useBuiltinAuth;
  }

  async onRegister() {
    this.router.navigate(['/user/register'], {
      state: this.model.getRawData(),
    });
  }
}
