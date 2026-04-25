import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt-ts';
import { SysPreference } from 'picsur-shared/dist/dto/sys-preferences.enum';
import {
  AsyncFailable,
  Fail,
  FT,
  HasFailed,
  HasSuccess,
} from 'picsur-shared/dist/types/failable';
import { FindResult } from 'picsur-shared/dist/types/find-result';
import { makeUnique } from 'picsur-shared/dist/util/unique';
import { Not, Repository } from 'typeorm';
import { EUserBackend } from '../../database/entities/users/user.entity.js';
import { Permissions } from '../../models/constants/permissions.const.js';
import {
  DefaultRolesList,
  SoulBoundRolesList,
} from '../../models/constants/roles.const.js';
import {
  ImmutableUsersList,
  LockedLoginUsersList,
  UndeletableUsersList,
} from '../../models/constants/special-users.const.js';
import { GetCols } from '../../util/collection.js';
import { SysPreferenceDbService } from '../preference-db/sys-preference-db.service.js';
import { RoleDbService } from '../role-db/role-db.service.js';

@Injectable()
export class UserDbService {
  private readonly logger = new Logger(UserDbService.name);

  constructor(
    @InjectRepository(EUserBackend)
    private readonly usersRepository: Repository<EUserBackend>,
    private readonly rolesService: RoleDbService,
    private readonly prefService: SysPreferenceDbService,
  ) {}

  // Creation and deletion

  public async create(
    username: string,
    password: string,
    roles?: string[],
    // Add option to create "invalid" users, should only be used by system
    byPassRoleCheck?: boolean,
    email?: string,
  ): AsyncFailable<EUserBackend> {
    if (await this.exists(username))
      return Fail(FT.Conflict, 'User already exists');

    if (email) {
      const emailExists = await this.emailExists(email);
      if (emailExists) return Fail(FT.Conflict, 'Email already in use');
    }

    const strength = await this.getBCryptStrength();
    const hashedPassword = await bcrypt.hash(password, strength);

    const user = new EUserBackend();
    user.username = username;
    user.hashed_password = hashedPassword;
    if (email) {
      user.email = email;
    }
    if (byPassRoleCheck) {
      const rolesToAdd = roles ?? [];
      user.roles = makeUnique(rolesToAdd);
    } else {
      // Strip soulbound roles and add default roles
      const rolesToAdd = this.filterAddedRoles(roles ?? []);
      user.roles = makeUnique([...DefaultRolesList, ...rolesToAdd]);
    }

    try {
      return await this.usersRepository.save(user);
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async delete(uuid: string): AsyncFailable<EUserBackend> {
    const userToDelete = await this.findOne(uuid);
    if (HasFailed(userToDelete)) return userToDelete;

    if (UndeletableUsersList.includes(userToDelete.username)) {
      return Fail(FT.Permission, 'Cannot delete system user');
    }

    try {
      return await this.usersRepository.remove(userToDelete);
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  // Updating

  public async setRoles(
    uuid: string,
    roles: string[],
  ): AsyncFailable<EUserBackend> {
    const userToModify = await this.findOne(uuid);
    if (HasFailed(userToModify)) return userToModify;

    if (ImmutableUsersList.includes(userToModify.username)) {
      this.logger.verbose('User tried to modify system user, failed silently');
      return userToModify;
    }

    const rolesToKeep = userToModify.roles.filter((role) =>
      SoulBoundRolesList.includes(role),
    );
    const rolesToAdd = this.filterAddedRoles(roles);
    const newRoles = makeUnique([...rolesToKeep, ...rolesToAdd]);
    this.logger.log(
      `setRoles: uuid=${uuid}, existingRoles=${JSON.stringify(userToModify.roles)}, rolesToKeep=${JSON.stringify(rolesToKeep)}, rolesToAdd=${JSON.stringify(rolesToAdd)}, newRoles=${JSON.stringify(newRoles)}`,
    );
    userToModify.roles = newRoles;

    try {
      const result = await this.usersRepository.save(userToModify);
      this.logger.log(`setRoles saved: ${JSON.stringify(result.roles)}`);
      return result;
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async removeRoleEveryone(role: string): AsyncFailable<true> {
    try {
      await this.usersRepository
        .createQueryBuilder('user')
        .update()
        .set({
          roles: () => 'ARRAY_REMOVE(roles, :role)',
        })
        .where('roles @> ARRAY[:role]', { role })
        .execute();
    } catch (e) {
      return Fail(FT.Database, e);
    }

    return true;
  }

  public async getPermissions(uuid: string): AsyncFailable<Permissions> {
    const userToModify = await this.findOne(uuid);
    if (HasFailed(userToModify)) return userToModify;

    return await this.rolesService.getPermissions(userToModify.roles);
  }

  public async updatePassword(
    uuid: string,
    password: string,
  ): AsyncFailable<EUserBackend> {
    let userToModify = await this.findOne(uuid);
    if (HasFailed(userToModify)) return userToModify;

    const strength = await this.getBCryptStrength();
    userToModify.hashed_password = await bcrypt.hash(password, strength);

    try {
      userToModify = await this.usersRepository.save(userToModify);
    } catch (e) {
      return Fail(FT.Database, e);
    }

    return userToModify;
  }

  // Authentication

  async authenticate(
    username: string,
    password: string,
  ): AsyncFailable<EUserBackend> {
    const user = await this.findByUsername(username, true);
    if (HasFailed(user)) {
      if (user.getType() === FT.NotFound)
        return Fail(
          FT.Authentication,
          'Wrong username or password',
          user.getDebugMessage(),
        );
      else return user;
    }

    if (LockedLoginUsersList.includes(user.username)) {
      // Error should be kept in backend
      return Fail(FT.Authentication, 'Wrong username or password');
    }

    if (!(await bcrypt.compare(password, user.hashed_password ?? '')))
      return Fail(FT.Authentication, 'Wrong username or password');

    return await this.findOne(user.id ?? '');
  }

  // Listing

  public async checkUsername(username: string): AsyncFailable<{
    available: boolean;
  }> {
    try {
      const found = await this.usersRepository.findOne({
        where: { username },
        select: ['id'],
      });

      return { available: !found };
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async findByUsername(
    username: string,
    // Also fetch fields that aren't normally sent to the client
    // (e.g. hashed password)
    getPrivate = false,
  ): AsyncFailable<EUserBackend> {
    try {
      const found = await this.usersRepository.findOne({
        where: { username },
        select: getPrivate ? GetCols(this.usersRepository) : undefined,
      });

      if (!found) return Fail(FT.NotFound, 'User not found');
      return found;
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async findOne(uuid: string): AsyncFailable<EUserBackend> {
    try {
      const found = await this.usersRepository.findOne({
        where: { id: uuid },
      });

      if (!found) return Fail(FT.NotFound, 'User not found');
      return found as EUserBackend;
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async findMany(
    count: number,
    page: number,
  ): AsyncFailable<FindResult<EUserBackend>> {
    if (count < 1 || page < 0) return Fail(FT.UsrValidation, 'Invalid page');
    if (count > 100) return Fail(FT.UsrValidation, 'Too many results');

    try {
      const [users, amount] = await this.usersRepository.findAndCount({
        take: count,
        skip: count * page,
        order: { username: 'ASC' },
      });

      if (users === undefined) return Fail(FT.NotFound, 'Users not found');

      return {
        results: users,
        total: amount,
        page,
        pages: Math.ceil(amount / count),
      };
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async count(): AsyncFailable<number> {
    try {
      return await this.usersRepository.count();
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async countExcludingGuest(): AsyncFailable<number> {
    try {
      return await this.usersRepository.count({
        where: {
          username: Not('guest'),
        },
      });
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async exists(username: string): Promise<boolean> {
    return HasSuccess(await this.findByUsername(username));
  }

  // OIDC methods

  public async findByExternalId(
    externalId: string,
  ): AsyncFailable<EUserBackend> {
    try {
      const found = await this.usersRepository.findOne({
        where: { external_id: externalId },
      });

      if (!found) return Fail(FT.NotFound, 'User not found');
      return found;
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async findByEmail(email: string): AsyncFailable<EUserBackend> {
    try {
      const found = await this.usersRepository.findOne({
        where: { email: email },
      });

      if (!found) return Fail(FT.NotFound, 'User not found');
      return found;
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async emailExists(email: string): Promise<boolean> {
    try {
      const found = await this.usersRepository.findOne({
        where: { email: email },
        select: ['id'],
      });
      return !!found;
    } catch {
      return false;
    }
  }

  public async setExternalId(
    uuid: string,
    externalId: string,
  ): AsyncFailable<EUserBackend> {
    const userToModify = await this.findOne(uuid);
    if (HasFailed(userToModify)) return userToModify;

    userToModify.external_id = externalId;

    try {
      return await this.usersRepository.save(userToModify);
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async createWithExternalId(
    username: string,
    externalId: string,
    roles?: string[],
    email?: string,
  ): AsyncFailable<EUserBackend> {
    if (await this.exists(username))
      return Fail(FT.Conflict, 'User already exists');

    if (email) {
      const emailExists = await this.emailExists(email);
      if (emailExists) return Fail(FT.Conflict, 'Email already in use');
    }

    const user = new EUserBackend();
    user.username = username;
    user.external_id = externalId;
    user.email = email;
    user.roles = makeUnique([...DefaultRolesList, ...(roles ?? [])]);

    try {
      return await this.usersRepository.save(user);
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async unlinkExternalId(uuid: string): AsyncFailable<EUserBackend> {
    const userToModify = await this.findOne(uuid);
    if (HasFailed(userToModify)) return userToModify;

    try {
      await this.usersRepository.update(uuid, { external_id: undefined });
      return await this.findOne(uuid);
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async setEmail(
    uuid: string,
    email: string,
  ): AsyncFailable<EUserBackend> {
    const userToModify = await this.findOne(uuid);
    if (HasFailed(userToModify)) return userToModify;

    const emailExists = await this.emailExists(email);
    if (emailExists) {
      const existingUser = await this.findByEmail(email);
      if (HasSuccess(existingUser) && existingUser.id !== uuid) {
        return Fail(FT.Conflict, 'Email already in use');
      }
    }

    userToModify.email = email;

    try {
      return await this.usersRepository.save(userToModify);
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  public async removeEmail(uuid: string): AsyncFailable<EUserBackend> {
    const userToModify = await this.findOne(uuid);
    if (HasFailed(userToModify)) return userToModify;

    try {
      await this.usersRepository.update(uuid, { email: undefined });
      return await this.findOne(uuid);
    } catch (e) {
      return Fail(FT.Database, e);
    }
  }

  // Internal

  private filterAddedRoles(roles: string[]): string[] {
    const filteredRoles = roles.filter(
      (role) => !SoulBoundRolesList.includes(role),
    );

    return filteredRoles;
  }

  private async getBCryptStrength(): Promise<number> {
    const result = await this.prefService.getNumberPreference(
      SysPreference.BCryptStrength,
    );
    if (HasFailed(result)) {
      return 12;
    }
    return result;
  }
}
