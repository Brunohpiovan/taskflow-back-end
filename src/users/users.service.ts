import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash: string;
  avatar?: string;
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
  passwordHash: string;
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
        passwordHash: data.passwordHash,
        avatar: data.avatar,
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
    const updateData: { name?: string; email?: string; passwordHash?: string } = {};
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
}
