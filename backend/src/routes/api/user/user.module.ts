import { Module } from '@nestjs/common';
import { UserDbModule } from '../../../collections/user-db/user-db.module.js';
import { RoleDbModule } from '../../../collections/role-db/role-db.module.js';
import { AuthManagerModule } from '../../../managers/auth/auth.module.js';
import { UserAdminController } from './user-manage.controller.js';
import { UserController } from './user.controller.js';

@Module({
  imports: [AuthManagerModule, UserDbModule, RoleDbModule],
  controllers: [UserController, UserAdminController],
})
export class UserApiModule {}
