import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ActivityLogsService {
  constructor(private prisma: PrismaService) {}

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

  async getByCardId(cardId: string) {
    const logs = await this.prisma.activityLog.findMany({
      where: { cardId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map((log) => ({
      ...log,
      createdAt: log.createdAt.toISOString(),
    }));
  }
}
