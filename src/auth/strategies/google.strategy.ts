import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';

interface GoogleProfile {
  id: string;
  emails?: { value: string }[];
  displayName?: string;
  photos?: { value: string }[];
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientId = configService.get<string>('google.clientId');
    const clientSecret = configService.get<string>('google.clientSecret');
    const backendUrl = configService.get<string>('backendUrl', 'http://localhost:3001');
    const apiPrefix = configService.get<string>('apiPrefix', 'api');
    super({
      clientID: clientId ?? '',
      clientSecret: clientSecret ?? '',
      callbackURL: `${backendUrl}/${apiPrefix}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GoogleProfile,
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    try {
      const result = await this.authService.validateOAuthUser('google', {
        id: profile.id,
        emails: profile.emails,
        displayName: profile.displayName,
        photos: profile.photos,
      });
      done(null, result);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
