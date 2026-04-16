import {
  forwardRef,
  Inject,
  Logger,
  Module,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HasFailed } from 'picsur-shared/dist/types/failable';
import { generateRandomString } from 'picsur-shared/dist/util/random';
import { AuthConfigService } from '../../config/early/auth.config.service.js';
import { EarlyConfigModule } from '../../config/early/early-config.module.js';
import { EUserBackend } from '../../database/entities/users/user.entity.js';
import { Permission } from '../../models/constants/permissions.const.js';
import { PreferenceDbModule } from '../preference-db/preference-db.module.js';
import { RoleDbModule } from '../role-db/role-db.module.js';
import { RoleDbService } from '../role-db/role-db.service.js';
import { UserDbService } from './user-db.service.js';

@Module({
  imports: [
    EarlyConfigModule,
    PreferenceDbModule,
    forwardRef(() => RoleDbModule),
    TypeOrmModule.forFeature([EUserBackend]),
  ],
  providers: [UserDbService],
  exports: [UserDbService],
})
export class UserDbModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(UserDbModule.name);

  constructor(
    private readonly usersService: UserDbService,
    private readonly authConfigService: AuthConfigService,
    @Inject(forwardRef(() => RoleDbService))
    private readonly rolesService: RoleDbService,
  ) {}

  async onApplicationBootstrap() {
    await this.ensureUserExists('guest', generateRandomString(128), ['guest']);
    await this.updateGuestRegistrationPermission();
  }

  public async getUserCount(): Promise<number> {
    const result = await this.usersService.countExcludingGuest();
    if (HasFailed(result)) return 0;
    return result;
  }

  private async updateGuestRegistrationPermission() {
    const userCount = await this.getUserCount();
    const guestRole = await this.rolesService.findOne('guest');
    if (HasFailed(guestRole)) return;

    const hasRegistration = guestRole.permissions.includes(
      Permission.UserRegister,
    );

    if (userCount > 0 && hasRegistration) {
      await this.rolesService.removePermissions('guest', [
        Permission.UserRegister,
      ]);
    } else if (userCount === 0 && !hasRegistration) {
      await this.rolesService.addPermissions('guest', [
        Permission.UserRegister,
      ]);
    }
  }

  private async ensureUserExists(
    username: string,
    password: string,
    roles: string[],
  ) {
    this.logger.verbose(`Ensuring user "${username}" exists`);

    const exists = await this.usersService.exists(username);
    if (exists) return;

    const newUser = await this.usersService.create(
      username,
      password,
      roles,
      true,
    );
    if (HasFailed(newUser)) {
      this.logger.error(
        `Failed to create user "${username}" because: ${newUser.getReason()}`,
      );
      return;
    }
  }
}
