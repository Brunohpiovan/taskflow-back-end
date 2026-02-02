import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { Environment } from '@prisma/client';

export interface EnvironmentResponse {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  boardsCount?: number;
  cardsCount?: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class EnvironmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string): Promise<EnvironmentResponse[]> {
    const environments = await this.prisma.environment.findMany({
      where: { userId },
      include: {
        _count: { select: { boards: true } },
        boards: {
          include: { _count: { select: { cards: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return environments.map((e) => this.toResponseWithCounts(e));
  }

  async findOne(id: string, userId: string): Promise<EnvironmentResponse> {
    const environment = await this.findOneOrThrow(id, userId);
    return this.toResponseWithCounts(environment);
  }

  async create(
    userId: string,
    dto: CreateEnvironmentDto,
  ): Promise<EnvironmentResponse> {
    const environment = await this.prisma.environment.create({
      data: {
        userId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        color: dto.color?.trim(),
        icon: dto.icon?.trim(),
      },
    });
    return this.toResponse(environment);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateEnvironmentDto,
  ): Promise<EnvironmentResponse> {
    await this.findOneOrThrow(id, userId);
    const environment = await this.prisma.environment.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.color !== undefined && { color: dto.color?.trim() }),
        ...(dto.icon !== undefined && { icon: dto.icon?.trim() }),
      },
    });
    return this.toResponse(environment as Environment);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOneOrThrow(id, userId);
    await this.prisma.environment.delete({ where: { id } });
  }

  private async findOneOrThrow(
    id: string,
    userId: string,
  ): Promise<
    Environment & {
      _count?: { boards: number };
      boards?: Array<{ _count: { cards: number } }>;
    }
  > {
    const environment = await this.prisma.environment.findFirst({
      where: { id, userId },
      include: {
        _count: { select: { boards: true } },
        boards: { include: { _count: { select: { cards: true } } } },
      },
    });
    if (!environment) {
      throw new NotFoundException('Ambiente não encontrado');
    }
    return environment;
  }

  private toResponse(e: Environment): EnvironmentResponse {
    return {
      id: e.id,
      name: e.name,
      description: e.description ?? undefined,
      color: e.color ?? undefined,
      icon: e.icon ?? undefined,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }

  private toResponseWithCounts(
    e: Environment & {
      _count?: { boards: number };
      boards?: Array<{ _count: { cards: number } }>;
    },
  ): EnvironmentResponse {
    const boardsCount = e._count?.boards;
    const cardsCount = e.boards?.reduce(
      (sum, b) => sum + b._count.cards,
      0,
    );
    return {
      ...this.toResponse(e),
      ...(boardsCount !== undefined && { boardsCount }),
      ...(cardsCount !== undefined && { cardsCount }),
    };
  }
}
