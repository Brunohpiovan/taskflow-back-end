import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PAGE_SIZE = 10;

export interface PaginatedActivityLogs {
  data: {
    id: string;
    cardId: string;
    userId: string;
    action: string;
    details: string | null;
    createdAt: string;
    user: { id: string; name: string; avatar: string | null };
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
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1, // fetch one extra to know if there's a next page
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // skip the cursor itself
      }),
    });

    const hasNextPage = logs.length > take;
    const data = hasNextPage ? logs.slice(0, take) : logs;
    const nextCursor = hasNextPage ? data[data.length - 1].id : null;

    return {
      data: data.map((log) => ({
        ...log,
        createdAt: log.createdAt.toISOString(),
      })),
      nextCursor,
    };
  }
}
