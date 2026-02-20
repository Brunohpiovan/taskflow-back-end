import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PAGE_SIZE = 10;

export interface PaginatedActivityLogs {
  data: {
    action: string;
    details: string | null;
    createdAt: string;
    user: { name: string; avatar: string | null };
  }[];
  nextCursor: string | null;
}

@Injectable()
export class ActivityLogsService {
  constructor(private prisma: PrismaService) { }

  async logAction(
    cardId: string,
    userId: string,
    action: string,
    details?: string,
  ) {
    return this.prisma.activityLog.create({
      data: {
        cardId,
        userId,
        action,
        details,
      },
    });
  }

  async getByCardId(
    cardId: string,
    cursor?: string,
    limit = DEFAULT_PAGE_SIZE,
  ): Promise<PaginatedActivityLogs> {
    const take = Math.min(limit, 50); // max 50 por request

    const logs = await this.prisma.activityLog.findMany({
      where: { cardId },
      select: {
        id: true, // needed for cursor-based pagination
        action: true,
        details: true,
        createdAt: true,
        user: { select: { name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
    });

    const hasNextPage = logs.length > take;
    const data = hasNextPage ? logs.slice(0, take) : logs;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data: data.map(({ id: _id, ...log }) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
      nextCursor,
    };
  }
}
