import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import {
  UserCheckNameRequest,
  UserCheckNameResponse,
  UserLoginResponse,
  UserMePermissionsResponse,
  UserMeResponse,
  UserRegisterRequest,
  UserRegisterResponse,
} from 'picsur-shared/dist/dto/api/user.dto';
import type { EUser } from 'picsur-shared/dist/entities/user.entity';
import {
  HasFailed,
  HasSuccess,
  ThrowIfFailed,
} from 'picsur-shared/dist/types/failable';
import { UserDbService } from '../../../collections/user-db/user-db.service.js';
import { RoleDbService } from '../../../collections/role-db/role-db.service.js';
import { EasyThrottle } from '../../../decorators/easy-throttle.decorator.js';
import {
  NoPermissions,
  RequiredPermissions,
  UseLocalAuth,
} from '../../../decorators/permissions.decorator.js';
import {
  ReqUser,
  ReqUserID,
} from '../../../decorators/request-user.decorator.js';
import { Returns } from '../../../decorators/returns.decorator.js';
import { AuthManagerService } from '../../../managers/auth/auth.service.js';
import { Permission } from '../../../models/constants/permissions.const.js';
import { EUserBackend2EUser } from '../../../models/transformers/user.transformer.js';

@Controller('api/user')
export class UserController {
  private readonly logger = new Logger(UserController.name);

  constructor(
    private readonly usersService: UserDbService,
    private readonly authService: AuthManagerService,
    private readonly rolesService: RoleDbService,
  ) {}

  @Post('login')
  @Returns(UserLoginResponse)
  @UseLocalAuth(Permission.UserLogin)
  @EasyThrottle(30, 300)
  async login(@ReqUser() user: EUser): Promise<UserLoginResponse> {
    const jwt_token = ThrowIfFailed(await this.authService.createToken(user));

    return { jwt_token };
  }

  @Post('register')
  @Returns(UserRegisterResponse)
  @RequiredPermissions(Permission.UserRegister)
  @EasyThrottle(5, 300)
  async register(
    @Body() register: UserRegisterRequest,
  ): Promise<UserRegisterResponse> {
    const userCount = await this.usersService.countExcludingGuest();
    const isFirstUser = HasSuccess(userCount) ? userCount === 0 : true;

    let user = ThrowIfFailed(
      await this.usersService.create(register.username, register.password),
    );

    if (isFirstUser) {
      this.logger.log('First user detected, setting admin role...');
      const setRolesResult = await this.usersService.setRoles(user.id, [
        'user',
        'admin',
      ]);
      if (HasFailed(setRolesResult)) {
        this.logger.error(
          `Failed to set admin role: ${setRolesResult.getReason()}`,
        );
      } else {
        this.logger.log('Admin role set successfully');
        user = ThrowIfFailed(await this.usersService.findOne(user.id));
      }

      const removePermResult = await this.rolesService.removePermissions(
        'guest',
        [Permission.UserRegister],
      );
      if (HasFailed(removePermResult)) {
        this.logger.error(
          `Failed to disable registration: ${removePermResult.getReason()}`,
        );
      } else {
        this.logger.log('Registration disabled successfully');
      }
    }

    return EUserBackend2EUser(user);
  }

  @Post('checkname')
  @Returns(UserCheckNameResponse)
  @RequiredPermissions(Permission.UserRegister)
  @EasyThrottle(20)
  async checkName(
    @Body() checkName: UserCheckNameRequest,
  ): Promise<UserCheckNameResponse> {
    return ThrowIfFailed(
      await this.usersService.checkUsername(checkName.username),
    );
  }

  @Get('me')
  @Returns(UserMeResponse)
  @RequiredPermissions(Permission.UserKeepLogin)
  @EasyThrottle(10)
  async me(@ReqUserID() userid: string): Promise<UserMeResponse> {
    const backenduser = ThrowIfFailed(await this.usersService.findOne(userid));

    const user = EUserBackend2EUser(backenduser);

    const token = ThrowIfFailed(await this.authService.createToken(user));

    return { user, token };
  }

  // You can always check your permissions
  @Get('me/permissions')
  @Returns(UserMePermissionsResponse)
  @NoPermissions()
  @EasyThrottle(20)
  async refresh(
    @ReqUserID() userid: string,
  ): Promise<UserMePermissionsResponse> {
    const permissions = ThrowIfFailed(
      await this.usersService.getPermissions(userid),
    );

    return { permissions };
  }
}
