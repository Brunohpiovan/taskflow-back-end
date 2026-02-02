import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash: string;
  avatar?: string;
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
}
