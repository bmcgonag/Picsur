import { Inject, Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy as JwtPassportStrategy } from 'passport-jwt';
import { JwtDataSchema } from 'picsur-shared/dist/dto/jwt.dto';
import { EUser } from 'picsur-shared/dist/entities/user.entity';
import { ThrowIfFailed } from 'picsur-shared/dist/types/failable';
import { UserDbService } from '../../../collections/user-db/user-db.service.js';
import { EUserBackend2EUser } from '../../../models/transformers/user.transformer.js';

const customJwtExtractor = (req: any) => {
  let authHeader = null;

  if (req?.headers?.authorization) {
    authHeader = req.headers.authorization;
  } else if (req?.raw?.headers?.authorization) {
    authHeader = req.raw.headers.authorization;
  } else if (typeof req?.authorization === 'string') {
    authHeader = req.authorization;
  }

  if (typeof authHeader === 'string') {
    authHeader = authHeader.trim();
    if (authHeader.startsWith('"') && authHeader.endsWith('"')) {
      authHeader = authHeader.substring(1, authHeader.length - 1);
    }
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(JwtPassportStrategy, 'jwt') {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @Inject('JWT_SECRET') jwtSecret: string,
    private readonly usersService: UserDbService,
  ) {
    super({
      jwtFromRequest: customJwtExtractor,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any): Promise<EUser | false> {
    const result = JwtDataSchema.safeParse(payload);
    if (!result.success) {
      this.logger.error('JWT could not be parsed: ' + result.error);
      return false;
    }

    const backendUser = ThrowIfFailed(
      await this.usersService.findOne(result.data.uid),
    );

    return EUserBackend2EUser(backendUser);
  }
}
