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

// Optimized select for card listing - only returns necessary fields for UI
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
      color: true, // Only color needed for label indicators
    },
  },
  members: {
    select: {
      user: {
        select: {
          avatar: true, // Only avatar needed for member chips
        },
      },
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
  members: {
    select: {
      id: true,
      userId: true,
      assignedAt: true,
      user: {
        select: {
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
  },
  dueDate: true,
  completed: true,
} as const;

// Minimal select for calendar view
const calendarCardSelect = {
  id: true,
  title: true,
  boardId: true,
  dueDate: true,
  completed: true,
} as const;


export interface CardListResponse {
  id: string;
  title: string;
  description?: string;
  position: number;
  boardId: string;
  labels: { color: string }[]; // Minimal: only color for UI
  members?: { avatar?: string }[]; // Minimal: only avatar for UI
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
  members?: {
    id: string;
    userId: string;
    name: string;
    email: string;
    avatar?: string;
    assignedAt: Date;
  }[];
  dueDate?: string;
  completed: boolean;
}

export interface CalendarCardResponse {
  id: string;
  title: string;
  boardId: string;
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

  async findAllWithDueDate(
    environmentId: string,
    userId: string,
  ): Promise<CalendarCardResponse[]> {
    // Verify user access to environment
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: {
        userId: true,
        members: { where: { userId }, select: { userId: true } },
      },
    });

    if (!environment) {
      throw new NotFoundException('Ambiente não encontrado');
    }

    const isOwner = environment.userId === userId;
    const isMember = environment.members.length > 0;

    if (!isOwner && !isMember) {
      throw new NotFoundException('Acesso negado');
    }

    const cards = await this.prisma.card.findMany({
      where: {
        board: { environmentId },
        dueDate: { not: null },
      },
      select: calendarCardSelect,
      orderBy: { dueDate: 'asc' },
    });

    return cards.map((c) => ({
      id: c.id,
      title: c.title,
      boardId: c.boardId,
      dueDate: c.dueDate?.toISOString(),
      completed: c.completed,
    }));
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
    console.log('CardsService.create - Members:', dto.members);
    const board = await this.boardsService.findOneForUser(dto.boardId, userId);

    // Validate members belong to the environment
    if (dto.members && dto.members.length > 0) {
      const environment = await this.prisma.environment.findUnique({
        where: { id: board.environmentId },
        select: {
          userId: true,
          members: {
            where: { userId: { in: dto.members } },
            select: { userId: true },
          },
        },
      });

      if (!environment) {
        throw new NotFoundException('Ambiente não encontrado');
      }

      const validMemberIds = new Set([
        environment.userId, // Owner
        ...environment.members.map((m) => m.userId), // Members
      ]);

      const invalidMembers = dto.members.filter(
        (id) => !validMemberIds.has(id),
      );
      if (invalidMembers.length > 0) {
        throw new NotFoundException(
          'Um ou mais usuários não pertencem ao ambiente',
        );
      }
    }

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
        members: dto.members
          ? {
            create: dto.members.map((memberId) => ({
              userId: memberId,
            })),
          }
          : undefined,
      },
      select: cardDetailSelect,
    });

    // Fire-and-forget logging
    this.activityLogsService
      .logAction(card.id, userId, 'CREATED', `Card criado: ${card.title}`)
      .catch((err) => console.error('Failed to log action', err));

    // Fetch envId for event
    const boardForEvent = await this.prisma.board.findUnique({
      where: { id: dto.boardId },
      select: { environmentId: true },
    });
    if (boardForEvent) {
      this.eventsGateway.emitCardCreated(boardForEvent.environmentId, {
        ...this.toResponse(card),
        userId,
      });
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
    this.activityLogsService
      .logAction(card.id, userId, 'UPDATED', 'Card atualizado')
      .catch((err) => console.error('Failed to log action', err));

    const board = await this.prisma.board.findUnique({
      where: { id: card.boardId },
      select: { environmentId: true },
    });
    if (board) {
      this.eventsGateway.emitCardUpdated(board.environmentId, {
        ...this.toResponse(card),
        userId,
      });
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
    this.activityLogsService
      .logAction(id, userId, 'MOVED', `Card movido para nova posição/quadro`)
      .catch((err) => console.error('Failed to log action', err));

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
    labels?: { color: string }[];
    members?: { user: { avatar: string | null } }[];
    dueDate?: Date | null;
    completed: boolean;
  }): CardListResponse {
    return {
      id: c.id,
      title: c.title,
      description: c.description ?? undefined,
      position: c.position,
      boardId: c.boardId,
      labels: c.labels ?? [], // Only color
      members: c.members?.map((m) => ({
        avatar: m.user.avatar ?? undefined, // Only avatar
      })),
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
    members?: {
      id: string;
      userId: string;
      assignedAt: Date;
      user: { name: string; email: string; avatar: string | null };
    }[];
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
      members: c.members?.map((m) => ({
        id: m.id,
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        avatar: m.user.avatar ?? undefined,
        assignedAt: m.assignedAt,
      })),
      dueDate: c.dueDate?.toISOString(),
      completed: c.completed,
    };
  }

  // Card Members Management
  async getCardMembers(cardId: string, userId: string) {
    await this.findOneOrThrow(cardId, userId);

    const members = await this.prisma.cardMember.findMany({
      where: { cardId },
      select: {
        id: true,
        userId: true,
        assignedAt: true,
        user: {
          select: {
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      avatar: m.user.avatar ?? undefined,
      assignedAt: m.assignedAt,
    }));
  }

  async addCardMember(
    cardId: string,
    memberUserId: string,
    currentUserId: string,
  ) {
    // Verify current user has access to the card
    await this.findOneOrThrow(cardId, currentUserId);

    // Verify the member being added belongs to the environment
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: {
        board: {
          select: {
            environmentId: true,
            environment: {
              select: {
                userId: true,
                members: {
                  where: { userId: memberUserId },
                  select: { userId: true },
                },
              },
            },
          },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Card não encontrado');
    }

    const isOwner = card.board.environment.userId === memberUserId;
    const isMember = card.board.environment.members.length > 0;

    if (!isOwner && !isMember) {
      throw new NotFoundException('Usuário não é membro do ambiente');
    }

    // Check if member is already assigned
    const existing = await this.prisma.cardMember.findUnique({
      where: {
        cardId_userId: {
          cardId,
          userId: memberUserId,
        },
      },
    });

    if (existing) {
      return this.getCardMembers(cardId, currentUserId);
    }

    // Add the member
    await this.prisma.cardMember.create({
      data: {
        cardId,
        userId: memberUserId,
      },
    });

    // Log the activity
    const user = await this.prisma.user.findUnique({
      where: { id: memberUserId },
      select: { name: true },
    });

    this.activityLogsService
      .logAction(
        cardId,
        currentUserId,
        'MEMBER_ADDED',
        `${user?.name || 'Membro'} adicionado ao card`,
      )
      .catch((err) => console.error('Failed to log action', err));

    // Emit WebSocket event for real-time update
    const updatedCard = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: {
        ...cardDetailSelect,
        board: {
          select: {
            environmentId: true,
          },
        },
      },
    });

    if (updatedCard) {
      this.eventsGateway.emitCardUpdated(
        updatedCard.board.environmentId,
        this.toResponse(updatedCard),
      );
    }

    return this.getCardMembers(cardId, currentUserId);
  }

  async removeCardMember(
    cardId: string,
    memberUserId: string,
    currentUserId: string,
  ) {
    // Verify current user has access to the card
    await this.findOneOrThrow(cardId, currentUserId);

    // Remove the member
    await this.prisma.cardMember.deleteMany({
      where: {
        cardId,
        userId: memberUserId,
      },
    });

    // Log the activity
    const user = await this.prisma.user.findUnique({
      where: { id: memberUserId },
      select: { name: true },
    });

    this.activityLogsService
      .logAction(
        cardId,
        currentUserId,
        'MEMBER_REMOVED',
        `${user?.name || 'Membro'} removido do card`,
      )
      .catch((err) => console.error('Failed to log action', err));

    // Emit WebSocket event for real-time update
    const updatedCard = await this.prisma.card.findUnique({
      where: { id: cardId },
      select: {
        ...cardDetailSelect,
        board: {
          select: {
            environmentId: true,
          },
        },
      },
    });

    if (updatedCard) {
      this.eventsGateway.emitCardUpdated(
        updatedCard.board.environmentId,
        this.toResponse(updatedCard),
      );
    }

    return this.getCardMembers(cardId, currentUserId);
  }
}
