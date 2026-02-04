import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash?: string | null;
  avatar?: string;
  provider?: string;
  providerId?: string;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  passwordHash?: string;
}

export interface UserForAuth {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

export interface UserWithPassword extends UserForAuth {
  passwordHash: string | null;
}

export interface UserWithResetToken extends UserWithPassword {
  resetPasswordExpires: Date | null;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<UserWithPassword | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        passwordHash: true,
      },
    });
  }

  async findByProvider(
    provider: string,
    providerId: string,
  ): Promise<UserForAuth | null> {
    return this.prisma.user.findFirst({
      where: { provider, providerId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });
  }

  async findOrCreateByOAuth(data: {
    provider: string;
    providerId: string;
    email: string;
    name: string;
    avatar?: string | null;
  }): Promise<UserForAuth> {
    const normalizedEmail = data.email.toLowerCase();
    const user = await this.findByProvider(data.provider, data.providerId);
    if (user) {
      return user;
    }
    const existingByEmail = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        provider: true,
        providerId: true,
      },
    });
    if (existingByEmail) {
      await this.prisma.user.update({
        where: { id: existingByEmail.id },
        data: {
          provider: data.provider,
          providerId: data.providerId,
          ...(data.avatar && { avatar: data.avatar }),
        },
      });
      return {
        id: existingByEmail.id,
        email: existingByEmail.email,
        name: existingByEmail.name,
        avatar: data.avatar ?? existingByEmail.avatar ?? null,
      };
    }
    const created = await this.prisma.user.create({
      data: {
        email: normalizedEmail,
        name: data.name.trim(),
        provider: data.provider,
        providerId: data.providerId,
        avatar: data.avatar ?? undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });
    return created;
  }

  async findById(id: string): Promise<UserForAuth | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });
  }

  async create(data: CreateUserData): Promise<UserForAuth> {
    const email = data.email.toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Este email já está em uso');
    }
    const user = await this.prisma.user.create({
      data: {
        email,
        name: data.name.trim(),
        ...(data.passwordHash != null && { passwordHash: data.passwordHash }),
        ...(data.avatar != null && { avatar: data.avatar }),
        ...(data.provider != null && { provider: data.provider }),
        ...(data.providerId != null && { providerId: data.providerId }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });
    return user;
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileData,
  ): Promise<UserForAuth> {
    const current = await this.findById(userId);
    if (!current) {
      throw new NotFoundException('Usuário não encontrado');
    }
    const updateData: { name?: string; email?: string; passwordHash?: string } =
      {};
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.email !== undefined) {
      const email = data.email.toLowerCase();
      if (email !== current.email) {
        const existing = await this.findByEmail(email);
        if (existing) {
          throw new ConflictException('Este email já está em uso');
        }
        updateData.email = email;
      }
    }
    if (data.passwordHash !== undefined) {
      updateData.passwordHash = data.passwordHash;
    }
    if (Object.keys(updateData).length === 0) {
      return current;
    }
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });
    return user;
  }

  async updateResetToken(
    userId: string,
    token: string,
    expires: Date,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        resetPasswordToken: token,
        resetPasswordExpires: expires,
      },
    });
  }

  async findByResetToken(token: string): Promise<UserWithResetToken | null> {
    return this.prisma.user.findUnique({
      where: { resetPasswordToken: token },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        passwordHash: true,
        resetPasswordExpires: true,
      },
    }) as Promise<UserWithResetToken | null>;
  }

  async updatePasswordAndClearToken(
    userId: string,
    passwordHash: string,
  ): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
  }
}
