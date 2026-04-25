import { Body, Controller, Get, Logger, Post } from '@nestjs/common';
import {
  GetSpecialUsersResponse,
  UserCreateRequest,
  UserCreateResponse,
  UserDeleteRequest,
  UserDeleteResponse,
  UserInfoRequest,
  UserInfoResponse,
  UserListRequest,
  UserListResponse,
  UserUpdateRequest,
  UserUpdateResponse,
} from 'picsur-shared/dist/dto/api/user-manage.dto';
import { ThrowIfFailed } from 'picsur-shared/dist/types/failable';
import { UserDbService } from '../../../collections/user-db/user-db.service.js';
import { EasyThrottle } from '../../../decorators/easy-throttle.decorator.js';
import { RequiredPermissions } from '../../../decorators/permissions.decorator.js';
import { Returns } from '../../../decorators/returns.decorator.js';
import { Permission } from '../../../models/constants/permissions.const.js';
import {
  ImmutableUsersList,
  LockedLoginUsersList,
  UndeletableUsersList,
} from '../../../models/constants/special-users.const.js';
import { EUserBackend2EUser } from '../../../models/transformers/user.transformer.js';
import { z } from 'zod';

const UserLinkOidcRequest = z.object({
  userId: z.string().uuid(),
  externalId: z.string().min(1),
});
type UserLinkOidcRequest = z.infer<typeof UserLinkOidcRequest>;

const UserUnlinkOidcRequest = z.object({
  userId: z.string().uuid(),
});
type UserUnlinkOidcRequest = z.infer<typeof UserUnlinkOidcRequest>;

@Controller('api/user')
@RequiredPermissions(Permission.UserAdmin)
export class UserAdminController {
  private readonly logger = new Logger(UserAdminController.name);

  constructor(private readonly usersService: UserDbService) {}

  @Post('list')
  @Returns(UserListResponse)
  async listUsersPaged(
    @Body() body: UserListRequest,
  ): Promise<UserListResponse> {
    const found = ThrowIfFailed(
      await this.usersService.findMany(body.count, body.page),
    );

    found.results = found.results.map(EUserBackend2EUser);
    return found;
  }

  @Post('create')
  @Returns(UserCreateResponse)
  @EasyThrottle(10)
  async register(
    @Body() create: UserCreateRequest,
  ): Promise<UserCreateResponse> {
    const user = ThrowIfFailed(
      await this.usersService.create(
        create.username,
        create.password,
        create.roles,
        undefined,
        create.email,
      ),
    );

    return EUserBackend2EUser(user);
  }

  @Post('delete')
  @Returns(UserDeleteResponse)
  async delete(@Body() body: UserDeleteRequest): Promise<UserDeleteResponse> {
    const user = ThrowIfFailed(await this.usersService.delete(body.id));

    return EUserBackend2EUser(user);
  }

  @Post('info')
  @Returns(UserInfoResponse)
  async getUser(@Body() body: UserInfoRequest): Promise<UserInfoResponse> {
    const user = ThrowIfFailed(await this.usersService.findOne(body.id));

    return EUserBackend2EUser(user);
  }

  @Post('update')
  @Returns(UserUpdateResponse)
  @EasyThrottle(20)
  async setPermissions(
    @Body() body: UserUpdateRequest,
  ): Promise<UserUpdateResponse> {
    let user = ThrowIfFailed(await this.usersService.findOne(body.id));

    if (body.roles) {
      user = ThrowIfFailed(
        await this.usersService.setRoles(body.id, body.roles),
      );
    }

    if (body.password) {
      user = ThrowIfFailed(
        await this.usersService.updatePassword(body.id, body.password),
      );
    }

    if (body.email !== undefined) {
      if (body.email) {
        user = ThrowIfFailed(
          await this.usersService.setEmail(body.id, body.email),
        );
      } else {
        user = ThrowIfFailed(await this.usersService.removeEmail(body.id));
      }
    }

    return EUserBackend2EUser(user);
  }

  @Get('special')
  @Returns(GetSpecialUsersResponse)
  async getSpecial(): Promise<GetSpecialUsersResponse> {
    return {
      ImmutableUsersList,
      LockedLoginUsersList,
      UndeletableUsersList,
    };
  }

  @Post('link-oidc')
  @EasyThrottle(20)
  async linkOidc(@Body() body: UserLinkOidcRequest) {
    const user = ThrowIfFailed(
      await this.usersService.setExternalId(body.userId, body.externalId),
    );
    return { success: true, user: EUserBackend2EUser(user) };
  }

  @Post('unlink-oidc')
  @EasyThrottle(20)
  async unlinkOidc(@Body() body: UserUnlinkOidcRequest) {
    const user = ThrowIfFailed(
      await this.usersService.unlinkExternalId(body.userId),
    );
    return { success: true, user: EUserBackend2EUser(user) };
  }
}
