import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { generateSlug, ensureUniqueSlug } from '../common/utils/slug.utils';

const environmentSelect = {
  id: true,
  slug: true,
  name: true,
  description: true,
} as const;

export interface EnvironmentResponse {
  id: string;
  slug: string;
  name: string;
  description?: string;
  boardsCount?: number;
  cardsCount?: number;
}

export interface DashboardEnvironmentResponse {
  id: string;
  slug: string;
  name: string;
  description?: string;
  boardsCount: number;
  cardsCount: number;
}

@Injectable()
export class EnvironmentsService {
  constructor(private prisma: PrismaService) { }

  async findAll(userId: string): Promise<EnvironmentResponse[]> {
    const environments = await this.prisma.environment.findMany({
      where: {
        OR: [
          { userId },
          { members: { some: { userId } } },
        ],
      },
      select: {
        ...environmentSelect,
        _count: { select: { boards: true } },
        boards: {
          select: { _count: { select: { cards: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
    return environments.map((e) => this.toResponseWithCounts(e));
  }

  async findAllDashboard(
    userId: string,
  ): Promise<DashboardEnvironmentResponse[]> {
    const environments = await this.prisma.environment.findMany({
      where: {
        OR: [
          { userId },
          { members: { some: { userId } } },
        ],
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        _count: { select: { boards: true } },
        boards: {
          select: { _count: { select: { cards: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return environments.map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      description: e.description ?? undefined,
      boardsCount: e._count.boards,
      cardsCount: e.boards.reduce((sum, b) => sum + b._count.cards, 0),
    }));
  }

  async findOne(id: string, userId: string): Promise<EnvironmentResponse> {
    const environment = await this.findOneOrThrow(id, userId);
    return this.toResponseWithCounts(environment);
  }

  async findBySlug(slug: string, userId: string): Promise<EnvironmentResponse> {
    const environment = await this.prisma.environment.findFirst({
      where: { slug, userId },
      select: {
        ...environmentSelect,
        _count: { select: { boards: true } },
        boards: {
          select: { _count: { select: { cards: true } } },
        },
      },
    });

    if (!environment) {
      throw new NotFoundException('Ambiente não encontrado');
    }

    return this.toResponseWithCounts(environment);
  }

  async create(
    userId: string,
    dto: CreateEnvironmentDto,
  ): Promise<EnvironmentResponse> {
    // Generate base slug from name
    const baseSlug = generateSlug(dto.name);

    // Get global existing slugs that start with the base slug to ensure uniqueness across the system
    const existingEnvs = await this.prisma.environment.findMany({
      where: {
        slug: {
          startsWith: baseSlug,
        },
      },
      select: { slug: true },
    });
    const existingSlugs = existingEnvs.map((e) => e.slug);

    // Ensure slug is unique
    const slug = ensureUniqueSlug(baseSlug, existingSlugs);

    // Use transaction to ensure both environment and member are created
    return this.prisma.$transaction(async (tx) => {
      const environment = await tx.environment.create({
        data: {
          userId,
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim(),
        },
        select: environmentSelect,
      });

      // Add creator as OWNER
      await tx.environmentMember.create({
        data: {
          environmentId: environment.id,
          userId,
          role: 'OWNER',
        },
      });

      return this.toResponse(environment);
    });
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateEnvironmentDto,
  ): Promise<EnvironmentResponse> {
    await this.findOneOrThrow(id, userId);

    const updateData: { name?: string; description?: string; slug?: string } = {
      ...(dto.name !== undefined && { name: dto.name.trim() }),
      ...(dto.description !== undefined && {
        description: dto.description?.trim(),
      }),
    };

    // Regenerate slug if name is changing
    if (dto.name !== undefined) {
      const baseSlug = generateSlug(dto.name);
      // Check globally for slug collisions, excluding the current environment
      const existingEnvs = await this.prisma.environment.findMany({
        where: {
          slug: {
            startsWith: baseSlug,
          },
          NOT: { id },
        },
        select: { slug: true },
      });
      const existingSlugs = existingEnvs.map((e) => e.slug);
      updateData.slug = ensureUniqueSlug(baseSlug, existingSlugs);
    }

    const environment = await this.prisma.environment.update({
      where: { id },
      data: updateData,
      select: environmentSelect,
    });
    return this.toResponse(environment);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOneOrThrow(id, userId);
    await this.prisma.environment.delete({ where: { id } });
  }

  private async findOneOrThrow(
    id: string,
    userId: string,
  ): Promise<
    { id: string; slug: string; name: string; description: string | null } & {
      _count?: { boards: number };
      boards?: Array<{ _count: { cards: number } }>;
    }
  > {
    const environment = await this.prisma.environment.findFirst({
      where: { id, userId },
      select: {
        ...environmentSelect,
        _count: { select: { boards: true } },
        boards: { select: { _count: { select: { cards: true } } } },
      },
    });
    if (!environment) {
      throw new NotFoundException('Ambiente não encontrado');
    }
    return environment;
  }

  private toResponse(e: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
  }): EnvironmentResponse {
    return {
      id: e.id,
      slug: e.slug,
      name: e.name,
      description: e.description ?? undefined,
    };
  }

  private toResponseWithCounts(e: {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    _count?: { boards: number };
    boards?: Array<{ _count: { cards: number } }>;
  }): EnvironmentResponse {
    const boardsCount = e._count?.boards;
    const cardsCount = e.boards?.reduce((sum, b) => sum + b._count.cards, 0);
    return {
      ...this.toResponse(e),
      ...(boardsCount !== undefined && { boardsCount }),
      ...(cardsCount !== undefined && { cardsCount }),
    };
  }
}
