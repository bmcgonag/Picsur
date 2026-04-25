import { EUserSchema } from 'picsur-shared/dist/entities/user.entity';
import {
  Column,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { z } from 'zod';
import { EApiKeyBackend } from '../apikey.entity.js';
import { EUsrPreferenceBackend } from '../system/usr-preference.entity.js';

// Different data for public and private

const _OverriddenEUserSchema = EUserSchema.omit({ hashedPassword: true }).merge(
  z.object({
    hashedPassword: z.string().optional(),
    externalId: z.string().optional(),
    email: z.string().email().optional(),
  }),
);
type OverriddenEUser = z.infer<typeof _OverriddenEUserSchema>;

@Entity()
export class EUserBackend implements OverriddenEUser {
  @PrimaryGeneratedColumn('uuid', {})
  id: string;

  @Index()
  @Column({ nullable: false, unique: true })
  username: string;

  @Column('text', { nullable: false, array: true })
  roles: string[];

  @Column({ nullable: false, select: false })
  hashed_password?: string;

  @Index()
  @Column({ nullable: true, unique: true })
  external_id?: string;

  @Index()
  @Column({ nullable: true, unique: true })
  email?: string;

  // This will never be populated, it is only here to auto delete apikeys when a user is deleted
  @OneToMany(() => EApiKeyBackend, (apikey) => apikey.user)
  apikeys?: EApiKeyBackend[];

  @OneToMany(() => EUsrPreferenceBackend, (pref) => pref.user_id)
  preferences?: EUsrPreferenceBackend[];
}
