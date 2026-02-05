import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import type { MoveCardResponseDto } from './dto/move-card-response.dto';

// Optimized select for card listing - only returns necessary fields
const cardListSelect = {
  id: true,
  title: true,
  description: true,
  position: true,
  boardId: true,
  dueDate: true,
  completed: true,
  labels: {
    select: {
      id: true,
      name: true,
      color: true,
    },
  },
} as const;

// Full select for card details
const cardDetailSelect = {
  id: true,
  title: true,
  description: true,
  position: true,
  boardId: true,
  labels: {
    select: {
      id: true,
      name: true,
      color: true,
      environmentId: true,
    },
  },
  dueDate: true,
  completed: true,
} as const;

export interface CardListResponse {
  id: string;
  title: string;
  description?: string;
  position: number;
  boardId: string;
  labels: { id: string; name: string; color: string }[];
  dueDate?: string;
  completed: boolean;
}

export interface CardResponse {
  id: string;
  title: string;
  description?: string;
  position: number;
  boardId: string;
  labels: { id: string; name: string; color: string }[];
  dueDate?: string;
  completed: boolean;
}

import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class CardsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => BoardsService))
    private boardsService: BoardsService,
    private activityLogsService: ActivityLogsService,
    private eventsGateway: EventsGateway,
  ) { }

  async findByBoardId(
    boardId: string,
    userId: string,
  ): Promise<CardListResponse[]> {
    await this.boardsService.findOneForUser(boardId, userId);
    const cards = await this.prisma.card.findMany({
      where: { boardId },
      select: cardListSelect,
      orderBy: { position: 'asc' },
    });
    return cards.map((c) => this.toListResponse(c));
  }

  async findOne(id: string, userId: string): Promise<CardResponse> {
    const card = await this.prisma.card.findUnique({
      where: { id },
      select: cardDetailSelect,
    });

    if (!card) {
      throw new NotFoundException('Card não encontrado');
    }

    // Verify user has access to this card
    const board = await this.prisma.board.findUnique({
      where: { id: card.boardId },
      select: {
        environment: {
          select: {
            userId: true,
            members: { where: { userId }, select: { userId: true } },
          },
        },
      },
    });

    if (!board) throw new NotFoundException('Card não encontrado');

    const isOwner = board.environment.userId === userId;
    const isMember = board.environment.members.length > 0;

    if (!isOwner && !isMember) {
      throw new NotFoundException('Card não encontrado');
    }

    return this.toResponse(card);
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
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        labels: dto.labels
          ? {
            connect: dto.labels.map((id) => ({ id })),
          }
          : undefined,
      },
      select: cardDetailSelect,
    });

    // Fire-and-forget logging
    this.activityLogsService.logAction(
      card.id,
      userId,
      'CREATED',
      `Card criado: ${card.title}`,
    ).catch(err => console.error('Failed to log action', err));

    // Fetch envId for event
    const board = await this.prisma.board.findUnique({
      where: { id: dto.boardId },
      select: { environmentId: true },
    });
    if (board) {
      this.eventsGateway.emitCardCreated(board.environmentId, { ...card, userId });
    }

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
        ...(dto.description !== undefined && {
          description: dto.description?.trim(),
        }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        }),
        ...(dto.completed !== undefined && { completed: dto.completed }),
        ...(dto.labels !== undefined && {
          labels: {
            set: dto.labels.map((labelId) => ({ id: labelId })),
          },
        }),
      },
      select: cardDetailSelect,
    });

    // Fire-and-forget logging
    this.activityLogsService.logAction(
      card.id,
      userId,
      'UPDATED',
      'Card atualizado',
    ).catch(err => console.error('Failed to log action', err));

    const board = await this.prisma.board.findUnique({
      where: { id: card.boardId },
      select: { environmentId: true },
    });
    if (board) {
      this.eventsGateway.emitCardUpdated(board.environmentId, { ...card, userId });
    }

    return this.toResponse(card);
  }

  async move(
    id: string,
    userId: string,
    dto: MoveCardDto,
  ): Promise<MoveCardResponseDto> {
    const card = await this.findOneOrThrow(id, userId);
    await this.boardsService.findOneForUser(dto.targetBoardId, userId);

    // ... existing transaction logic ...
    // Re-implementing transaction logic is verbose to replace.
    // I'll try to just wrap the existing logic or simpler: assume move is complex and just insert the log creation after.

    // Actually, since I have to replace the whole file content block or chunk.
    // I will return the existing move implementation but Add log at the end.

    // Wait, replacing the whole file is safer given the complexity of 'move'.

    return this._moveWithLog(id, userId, dto, card);
  }

  // Refactored move to include logging
  private async _moveWithLog(
    id: string,
    userId: string,
    dto: MoveCardDto,
    card: { id: string; boardId: string; position: number },
  ) {
    const sameBoard = card.boardId === dto.targetBoardId;
    const moveSelect = { id: true, boardId: true, position: true } as const;

    const updated = await this.prisma.$transaction(async (tx) => {
      // ... (Logic from original file, copied 1:1) ...
      if (sameBoard) {
        const cards = await tx.card.findMany({
          where: { boardId: card.boardId },
          select: { id: true, position: true },
          orderBy: { position: 'asc' },
        });
        const fromIdx = cards.findIndex((c) => c.id === id);
        if (fromIdx < 0)
          return {
            id: card.id,
            boardId: card.boardId,
            position: card.position,
          };
        const toIdx = Math.min(Math.max(0, dto.newPosition), cards.length - 1);
        if (fromIdx === toIdx) {
          // Optimization: if no move, just return
          return {
            id: card.id,
            boardId: card.boardId,
            position: card.position,
          };
        }

        const withoutCard = cards.filter((c) => c.id !== id);
        // Insert at new position - position will be set by the loop below
        withoutCard.splice(toIdx, 0, { id: card.id, position: toIdx });

        for (let i = 0; i < withoutCard.length; i++) {
          if (withoutCard[i].position !== i) {
            await tx.card.update({
              where: { id: withoutCard[i].id },
              data: { position: i },
            });
          }
        }
        return tx.card.findUniqueOrThrow({
          where: { id },
          select: moveSelect,
        });
      }
      // Different board
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
        if (c.position !== newPos) {
          await tx.card.update({
            where: { id: c.id },
            data: { position: newPos },
          });
        }
      }
      return tx.card.update({
        where: { id },
        data: { boardId: dto.targetBoardId, position: dto.newPosition },
        select: moveSelect,
      });
    });

    // Fire-and-forget logging
    this.activityLogsService.logAction(
      id,
      userId,
      'MOVED',
      `Card movido para nova posição/quadro`,
    ).catch(err => console.error('Failed to log action', err));

    // Emit event
    // We need environmentId. card object passed in has boardId, but not envId.
    // Fetch envId from board.
    const board = await this.prisma.board.findUnique({
      where: { id: dto.targetBoardId },
      select: { environmentId: true },
    });

    if (board) {
      this.eventsGateway.emitCardMoved(board.environmentId, {
        cardId: id,
        fromBoardId: card.boardId,
        toBoardId: dto.targetBoardId,
        newPosition: dto.newPosition,
        userId, // who moved it
      });
    }

    return updated;
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOneOrThrow(id, userId);

    // Fetch envId for event before deletion
    const card = await this.prisma.card.findUnique({
      where: { id },
      select: {
        boardId: true,
        board: { select: { environmentId: true } },
      },
    });

    await this.prisma.card.delete({ where: { id } });

    if (card) {
      this.eventsGateway.emitCardDeleted(card.board.environmentId, {
        cardId: id,
        boardId: card.boardId,
        userId,
      });
    }
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
        board: {
          select: { environment: { select: { userId: true, id: true } } },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Card não encontrado');
    }

    const environment = card.board.environment;
    const isOwner = environment.userId === userId;

    if (!isOwner) {
      const isMember = await this.prisma.environmentMember.findFirst({
        where: {
          environmentId: environment.id,
          userId: userId,
        },
      });

      if (!isMember) {
        throw new NotFoundException('Card não encontrado');
      }
    }

    return { id: card.id, boardId: card.boardId, position: card.position };
  }

  private toListResponse(c: {
    id: string;
    title: string;
    description?: string | null;
    position: number;
    boardId: string;
    labels?: { id: string; name: string; color: string }[];
    dueDate?: Date | null;
    completed: boolean;
  }): CardListResponse {
    return {
      id: c.id,
      title: c.title,
      description: c.description ?? undefined,
      position: c.position,
      boardId: c.boardId,
      labels: c.labels ?? [],
      dueDate: c.dueDate?.toISOString(),
      completed: c.completed,
    };
  }

  private toResponse(c: {
    id: string;
    title: string;
    description?: string | null;
    position: number;
    boardId: string;
    labels?: { id: string; name: string; color: string }[];
    dueDate?: Date | null;
    completed: boolean;
  }): CardResponse {
    return {
      id: c.id,
      title: c.title,
      description: c.description ?? undefined,
      position: c.position,
      boardId: c.boardId,
      labels: c.labels ?? [],
      dueDate: c.dueDate?.toISOString(),
      completed: c.completed,
    };
  }
}
