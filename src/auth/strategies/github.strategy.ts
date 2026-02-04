import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Strategy } from 'passport-github2';
import { AuthService } from '../auth.service';

interface GitHubProfile {
  id: string;
  displayName?: string;
  username?: string;
  emails?: { value: string }[];
  photos?: { value: string }[];
}

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const clientID = configService.get<string>('github.clientId');
    const clientSecret = configService.get<string>('github.clientSecret');
    const backendUrl = configService.get<string>(
      'backendUrl',
      'http://localhost:3001',
    );
    const apiPrefix = configService.get<string>('apiPrefix', 'api');
    super({
      clientID: clientID ?? '',
      clientSecret: clientSecret ?? '',
      callbackURL: `${backendUrl}/${apiPrefix}/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: GitHubProfile,
    done: (err: Error | null, user?: unknown) => void,
  ): Promise<void> {
    try {
      const result = await this.authService.validateOAuthUser('github', {
        id: profile.id,
        emails: profile.emails,
        displayName: profile.displayName ?? profile.username ?? undefined,
        photos: profile.photos,
      });
      done(null, result);
    } catch (err) {
      done(err as Error, undefined);
    }
  }
}
