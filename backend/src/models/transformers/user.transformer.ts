import { EUser } from 'picsur-shared/dist/entities/user.entity';
import { EUserBackend } from '../../database/entities/users/user.entity.js';

export function EUserBackend2EUser(eUser: EUserBackend): EUser {
  const result: EUser = {
    id: eUser.id,
    username: eUser.username,
    roles: eUser.roles,
    externalId: eUser.external_id ?? undefined,
    email: eUser.email ?? undefined,
  };

  return result;
}
