import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

export interface CreateUserData {
  email: string;
  name: string;
  passwordHash: string;
  avatar?: string;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: CreateUserData): Promise<User> {
    const email = data.email.toLowerCase();
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('Este email já está em uso');
    }
    return this.prisma.user.create({
      data: {
        email,
        name: data.name.trim(),
        passwordHash: data.passwordHash,
        avatar: data.avatar,
      },
    });
  }
}
