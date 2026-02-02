import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { Card } from '@prisma/client';

export interface CardResponse {
  id: string;
  title: string;
  description?: string;
  position: number;
  boardId: string;
  labels?: string[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
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
    });
    return this.toResponse(card);
  }

  async move(
    id: string,
    userId: string,
    dto: MoveCardDto,
  ): Promise<CardResponse> {
    const card = await this.findOneOrThrow(id, userId);
    await this.boardsService.findOneForUser(dto.targetBoardId, userId);
    const sameBoard = card.boardId === dto.targetBoardId;
    const updated = await this.prisma.$transaction(async (tx) => {
      if (sameBoard) {
        const cards = await tx.card.findMany({
          where: { boardId: card.boardId },
          orderBy: { position: 'asc' },
        });
        const fromIdx = cards.findIndex((c) => c.id === id);
        if (fromIdx < 0) return card;
        const toIdx = Math.min(Math.max(0, dto.newPosition), cards.length - 1);
        if (fromIdx === toIdx) {
          return tx.card.update({
            where: { id },
            data: { position: dto.newPosition },
          });
        }
        const withoutCard = cards.filter((c) => c.id !== id);
        withoutCard.splice(toIdx, 0, card);
        for (let i = 0; i < withoutCard.length; i++) {
          await tx.card.update({
            where: { id: withoutCard[i].id },
            data: { position: i },
          });
        }
        return tx.card.findUniqueOrThrow({ where: { id } });
      }
      const targetCards = await tx.card.findMany({
        where: { boardId: dto.targetBoardId },
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
      });
    });
    return this.toResponse(updated);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOneOrThrow(id, userId);
    await this.prisma.card.delete({ where: { id } });
  }

  private async findOneOrThrow(id: string, userId: string): Promise<Card> {
    const card = await this.prisma.card.findUnique({
      where: { id },
      include: { board: { include: { environment: true } } },
    });
    if (!card || card.board.environment.userId !== userId) {
      throw new NotFoundException('Card não encontrado');
    }
    return card;
  }

  private toResponse(c: Card): CardResponse {
    const labels = c.labels as string[] | null;
    return {
      id: c.id,
      title: c.title,
      description: c.description ?? undefined,
      position: c.position,
      boardId: c.boardId,
      labels: labels ?? undefined,
      dueDate: c.dueDate?.toISOString(),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    };
  }
}
