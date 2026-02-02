import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import type { MoveCardResponseDto } from './dto/move-card-response.dto'; // shape only

const cardSelect = {
  id: true,
  title: true,
  description: true,
  position: true,
  boardId: true,
  labels: true,
  dueDate: true,
} as const;

export interface CardResponse {
  id: string;
  title: string;
  description?: string;
  position: number;
  boardId: string;
  labels?: string[];
  dueDate?: string;
}

@Injectable()
export class CardsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BoardsService))
    private boardsService: BoardsService,
  ) {}

  async findByBoardId(boardId: string, userId: string): Promise<CardResponse[]> {
    await this.boardsService.findOneForUser(boardId, userId);
    const cards = await this.prisma.card.findMany({
      where: { boardId },
      select: cardSelect,
      orderBy: { position: 'asc' },
    });
    return cards.map((c) => this.toResponse(c));
  }

  async create(userId: string, dto: CreateCardDto): Promise<CardResponse> {
    await this.boardsService.findOneForUser(dto.boardId, userId);
    const position =
      dto.position ??
      (await this.prisma.card.count({ where: { boardId: dto.boardId } }));
    const card = await this.prisma.card.create({
      data: {
        boardId: dto.boardId,
        title: dto.title.trim(),
        description: dto.description?.trim(),
        position,
        labels: dto.labels ?? undefined,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      },
      select: cardSelect,
    });
    return this.toResponse(card);
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateCardDto,
  ): Promise<CardResponse> {
    await this.findOneOrThrow(id, userId);
    const card = await this.prisma.card.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.labels !== undefined && { labels: dto.labels }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
      },
      select: cardSelect,
    });
    return this.toResponse(card);
  }

  async move(
    id: string,
    userId: string,
    dto: MoveCardDto,
  ): Promise<MoveCardResponseDto> {
    const card = await this.findOneOrThrow(id, userId);
    await this.boardsService.findOneForUser(dto.targetBoardId, userId);
    const sameBoard = card.boardId === dto.targetBoardId;
    const moveSelect = { id: true, boardId: true, position: true } as const;
    const updated = await this.prisma.$transaction(async (tx) => {
      if (sameBoard) {
        const cards = await tx.card.findMany({
          where: { boardId: card.boardId },
          select: { id: true, position: true },
          orderBy: { position: 'asc' },
        });
        const fromIdx = cards.findIndex((c) => c.id === id);
        if (fromIdx < 0) return { id: card.id, boardId: card.boardId, position: card.position };
        const toIdx = Math.min(Math.max(0, dto.newPosition), cards.length - 1);
        if (fromIdx === toIdx) {
          const r = await tx.card.update({
            where: { id },
            data: { position: dto.newPosition },
            select: moveSelect,
          });
          return r;
        }
        const withoutCard = cards.filter((c) => c.id !== id);
        withoutCard.splice(toIdx, 0, { id: card.id, position: card.position });
        for (let i = 0; i < withoutCard.length; i++) {
          await tx.card.update({
            where: { id: withoutCard[i].id },
            data: { position: i },
          });
        }
        return tx.card.findUniqueOrThrow({
          where: { id },
          select: moveSelect,
        });
      }
      const targetCards = await tx.card.findMany({
        where: { boardId: dto.targetBoardId },
        select: { id: true },
        orderBy: { position: 'asc' },
      });
      for (let i = dto.newPosition; i < targetCards.length; i++) {
        await tx.card.update({
          where: { id: targetCards[i].id },
          data: { position: i + 1 },
        });
      }
      const sourceCards = await tx.card.findMany({
        where: { boardId: card.boardId },
        select: { id: true, position: true },
        orderBy: { position: 'asc' },
      });
      for (const c of sourceCards) {
        if (c.id === id) continue;
        const newPos = c.position > card.position ? c.position - 1 : c.position;
        await tx.card.update({
          where: { id: c.id },
          data: { position: newPos },
        });
      }
      return tx.card.update({
        where: { id },
        data: { boardId: dto.targetBoardId, position: dto.newPosition },
        select: moveSelect,
      });
    });
    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOneOrThrow(id, userId);
    await this.prisma.card.delete({ where: { id } });
  }

  private async findOneOrThrow(
    id: string,
    userId: string,
  ): Promise<{ id: string; boardId: string; position: number }> {
    const card = await this.prisma.card.findUnique({
      where: { id },
      select: {
        id: true,
        boardId: true,
        position: true,
        board: { select: { environment: { select: { userId: true } } } },
      },
    });
    if (!card || card.board.environment.userId !== userId) {
      throw new NotFoundException('Card não encontrado');
    }
    return { id: card.id, boardId: card.boardId, position: card.position };
  }

  private toResponse(c: {
    id: string;
    title: string;
    description?: string | null;
    position: number;
    boardId: string;
    labels?: unknown;
    dueDate?: Date | null;
  }): CardResponse {
    const labels = c.labels as string[] | null | undefined;
    return {
      id: c.id,
      title: c.title,
      description: c.description ?? undefined,
      position: c.position,
      boardId: c.boardId,
      labels: labels ?? undefined,
      dueDate: c.dueDate?.toISOString(),
    };
  }
}
