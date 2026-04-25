import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { OidcService } from './oidc.service.js';
import { OidcConfigService } from './oidc-config.service.js';
import { OidcController } from '../../routes/api/auth/oidc.controller.js';
import { PreferenceDbModule } from '../../collections/preference-db/preference-db.module.js';
import { UserDbModule } from '../../collections/user-db/user-db.module.js';
import {
  JwtConfigService,
  JwtSecretProvider,
} from '../../config/late/jwt.config.service.js';
import { LateConfigModule } from '../../config/late/late-config.module.js';
import { AuthManagerService } from '../auth/auth.service.js';

@Module({
  imports: [
    PreferenceDbModule,
    UserDbModule,
    LateConfigModule,
    JwtModule.registerAsync({
      useExisting: JwtConfigService,
      imports: [LateConfigModule],
    }),
  ],
  controllers: [OidcController],
  providers: [
    OidcService,
    OidcConfigService,
    JwtSecretProvider,
    AuthManagerService,
  ],
  exports: [OidcService, OidcConfigService],
})
export class OidcModule {}
