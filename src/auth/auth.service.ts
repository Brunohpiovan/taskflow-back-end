import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { MailService } from '../services/mail.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import type { AuthResponseDto, UserResponseDto } from './dto/auth-response.dto';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 10;

  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private mailService: MailService,
  ) { }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Esta conta usa login com Google ou GitHub. Use um deles para entrar.',
      );
    }
    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email ou senha inválidos');
    }
    return this.buildAuthResponse(user);
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    const user = await this.usersService.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });
    return this.buildAuthResponse(user);
  }

  async validateOAuthUser(
    provider: string,
    profile: {
      id: string;
      emails?: { value: string }[];
      displayName?: string;
      photos?: { value: string }[];
    },
  ): Promise<AuthResponseDto> {
    const email =
      profile.emails?.[0]?.value ?? `${profile.id}@${provider}.oauth`;
    const name =
      profile.displayName?.trim() ?? email.split('@')[0] ?? 'Usuário';
    const avatar = profile.photos?.[0]?.value ?? null;
    const user = await this.usersService.findOrCreateByOAuth({
      provider,
      providerId: profile.id,
      email,
      name,
      avatar,
    });
    return this.buildAuthResponse(user);
  }

  async refresh(payload: JwtPayload): Promise<AuthResponseDto> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return this.buildAuthResponse(user);
  }

  async getProfile(payload: JwtPayload): Promise<UserResponseDto> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? undefined,
    };
  }

  async updateProfile(
    payload: JwtPayload,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const userId = payload.sub;
    let passwordHash: string | undefined;
    if (dto.password !== undefined && dto.password.trim() !== '') {
      if (!dto.confirmPassword || dto.confirmPassword.trim() === '') {
        throw new BadRequestException('Confirme a senha');
      }
      if (dto.password !== dto.confirmPassword) {
        throw new BadRequestException('As senhas não coincidem');
      }
      passwordHash = await bcrypt.hash(dto.password, this.saltRounds);
    }
    const user = await this.usersService.updateProfile(userId, {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(passwordHash !== undefined && { passwordHash }),
    });
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? undefined,
    };
  }

  async forgotPassword(email: string): Promise<void> {
    this.logger.log(`Initiating password reset for email: ${email}`);
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      this.logger.log(`User not found for email: ${email}`);
      // Security: Don't reveal if user exists or not, just return
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // 1 hour

    this.logger.log(`Generated reset token for ${email}, updating database`);
    try {
      await this.usersService.updateResetToken(user.id, token, expires);
      this.logger.log(`Database updated. Sending password reset email`);
      await this.mailService.sendPasswordResetEmail(user.email, token);
      this.logger.log(`Password reset email sent successfully`);
    } catch (error) {
      this.logger.error(`Error during password reset process:`, error);
      throw error;
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // We need a method in UsersService to find by token
    const user = await this.usersService.findByResetToken(token);

    if (
      !user ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date()
    ) {
      throw new BadRequestException('Token inválido ou expirado');
    }

    const passwordHash = await bcrypt.hash(newPassword, this.saltRounds);

    await this.usersService.updatePasswordAndClearToken(user.id, passwordHash);
  }

  private async buildAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    avatar: string | null;
  }): Promise<AuthResponseDto> {
    const expiresIn = this.configService.get<string>('jwt.expiresIn') ?? '7d';
    const expiresInSeconds =
      expiresIn === '7d' ? 604800 : parseInt(expiresIn, 10) || 604800;
    const token = this.jwtService.sign(
      { sub: user.id, email: user.email },
      {
        secret:
          this.configService.get<string>('jwt.secret') ?? 'default-secret',
        expiresIn: expiresInSeconds,
      },
    );
    const userResponse: UserResponseDto = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar ?? undefined,
    };
    return { user: userResponse, token };
  }
}
