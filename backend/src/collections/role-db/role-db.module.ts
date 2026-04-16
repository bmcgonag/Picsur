import { forwardRef, Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HasFailed } from 'picsur-shared/dist/types/failable';
import { EarlyConfigModule } from '../../config/early/early-config.module.js';
import { ERoleBackend } from '../../database/entities/users/role.entity.js';
import {
  ImmutableRolesList,
  SystemRoleDefaults,
  SystemRolesList,
} from '../../models/constants/roles.const.js';
import { RoleDbService } from './role-db.service.js';

@Module({
  imports: [EarlyConfigModule, TypeOrmModule.forFeature([ERoleBackend])],
  providers: [RoleDbService],
  exports: [RoleDbService],
})
export class RoleDbModule implements OnModuleInit {
  constructor(private readonly rolesService: RoleDbService) {}

  async onModuleInit() {
    await this.ensureSystemRolesExist();
    await this.updateImmutableRoles();
  }

  private async ensureSystemRolesExist() {
    for (const systemRole of SystemRolesList) {
      const exists = await this.rolesService.exists(systemRole);
      if (exists) continue;

      const newRole = await this.rolesService.create(
        systemRole,
        SystemRoleDefaults[systemRole],
      );
      if (HasFailed(newRole)) {
        continue;
      }
    }
  }

  private async updateImmutableRoles() {
    for (const immutableRole of ImmutableRolesList) {
      const result = await this.rolesService.setPermissions(
        immutableRole,
        SystemRoleDefaults[immutableRole],
        true,
      );
      if (HasFailed(result)) continue;
    }
  }
}
