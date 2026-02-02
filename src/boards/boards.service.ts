import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';

const boardSelect = {
  id: true,
  environmentId: true,
  name: true,
  description: true,
  position: true,
} as const;

export interface BoardResponse {
  id: string;
  name: string;
  description?: string;
  position: number;
  environmentId: string;
  cardsCount?: number;
}

@Injectable()
export class BoardsService {
  constructor(private prisma: PrismaService) {}

  async findByEnvironmentId(
    environmentId: string,
    userId: string,
  ): Promise<BoardResponse[]> {
    await this.assertEnvironmentBelongsToUser(environmentId, userId);
    const boards = await this.prisma.board.findMany({
      where: { environmentId },
      select: {
        ...boardSelect,
        _count: { select: { cards: true } },
      },
      orderBy: { position: 'asc' },
    });
    return boards.map((b) => this.toResponse(b));
  }

  async create(userId: string, dto: CreateBoardDto): Promise<BoardResponse> {
    await this.assertEnvironmentBelongsToUser(dto.environmentId, userId);
    const position =
      dto.position ??
      (await this.prisma.board.count({ where: { environmentId: dto.environmentId } }));
    const board = await this.prisma.board.create({
      data: {
        environmentId: dto.environmentId,
        name: dto.name.trim(),
        description: dto.description?.trim(),
        position,
      },
      select: boardSelect,
    });
    return this.toResponse(board);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateBoardDto,
  ): Promise<BoardResponse> {
    await this.findOneOrThrow(id, userId);
    const updated = await this.prisma.board.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
      select: boardSelect,
    });
    return this.toResponse(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOneOrThrow(id, userId);
    await this.prisma.board.delete({ where: { id } });
  }

  async findOneForUser(
    boardId: string,
    userId: string,
  ): Promise<{ id: string; environmentId: string; name: string; description: string | null; position: number }> {
    const board = await this.findOneOrThrow(boardId, userId);
    return board;
  }

  private async assertEnvironmentBelongsToUser(
    environmentId: string,
    userId: string,
  ): Promise<void> {
    const env = await this.prisma.environment.findFirst({
      where: { id: environmentId, userId },
      select: { id: true },
    });
    if (!env) {
      throw new NotFoundException('Ambiente não encontrado');
    }
  }

  private async findOneOrThrow(
    id: string,
    userId: string,
  ): Promise<
    { id: string; environmentId: string; name: string; description: string | null; position: number } & {
      _count?: { cards: number };
    }
  > {
    const board = await this.prisma.board.findFirst({
      where: { id },
      select: {
        ...boardSelect,
        environment: { select: { userId: true } },
        _count: { select: { cards: true } },
      },
    });
    if (!board || board.environment.userId !== userId) {
      throw new NotFoundException('Board não encontrado');
    }
    const { environment: _, ...rest } = board;
    return rest;
  }

  private toResponse(
    b: { id: string; name: string; description?: string | null; position: number; environmentId: string; _count?: { cards: number } },
  ): BoardResponse {
    return {
      id: b.id,
      name: b.name,
      description: b.description ?? undefined,
      position: b.position,
      environmentId: b.environmentId,
      ...(b._count?.cards !== undefined && { cardsCount: b._count.cards }),
    };
  }
}
