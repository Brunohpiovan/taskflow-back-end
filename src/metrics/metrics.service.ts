import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    MetricsResponseDto,
    ActivityItem,
    BoardMetric,
    LabelMetric,
} from './dto/metrics-response.dto';

@Injectable()
export class MetricsService {
    constructor(private readonly prisma: PrismaService) { }

    async getMetrics(userId: string): Promise<MetricsResponseDto> {
        // Executar todas as queries em paralelo para melhor performance
        const [
            totalEnvironments,
            totalBoards,
            cardStats,
            cardsLast7Days,
            overdueTasks,
            tasksDueSoon,
            totalComments,
            recentActivity,
            cardsByBoard,
            cardsByLabel,
        ] = await Promise.all([
            this.getTotalEnvironments(userId),
            this.getTotalBoards(userId),
            this.getCardStats(userId),
            this.getCardsLast7Days(userId),
            this.getOverdueTasks(userId),
            this.getTasksDueSoon(userId),
            this.getTotalComments(userId),
            this.getRecentActivity(userId),
            this.getCardsByBoard(userId),
            this.getCardsByLabel(userId),
        ]);

        const completionRate =
            cardStats.total > 0
                ? Math.round((cardStats.completed / cardStats.total) * 100)
                : 0;

        return {
            totalEnvironments,
            totalBoards,
            totalCards: cardStats.total,
            completionRate,
            cardsCreatedLast7Days: cardsLast7Days.created,
            cardsCompletedLast7Days: cardsLast7Days.completed,
            overdueTasks,
            tasksDueSoon,
            totalComments,
            recentActivity,
            cardsByBoard,
            cardsByLabel,
        };
    }

    private async getTotalEnvironments(userId: string): Promise<number> {
        // Conta ambientes onde o usuário é owner OU membro
        const result = await this.prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(DISTINCT e.id) as total
      FROM environments e
      LEFT JOIN environment_members em ON e.id = em.environment_id
      WHERE e.user_id = ${userId} OR em.user_id = ${userId}
    `;
        return Number(result[0]?.total || 0);
    }

    private async getTotalBoards(userId: string): Promise<number> {
        const result = await this.prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(DISTINCT b.id) as total
      FROM boards b
      INNER JOIN environments e ON b.environment_id = e.id
      LEFT JOIN environment_members em ON e.id = em.environment_id
      WHERE e.user_id = ${userId} OR em.user_id = ${userId}
    `;
        return Number(result[0]?.total || 0);
    }

    private async getCardStats(
        userId: string,
    ): Promise<{ total: number; completed: number }> {
        // Usar subquery para evitar problemas com COUNT DISTINCT e CASE
        const totalResult = await this.prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(DISTINCT c.id) as total
      FROM cards c
      INNER JOIN boards b ON c.board_id = b.id
      INNER JOIN environments e ON b.environment_id = e.id
      LEFT JOIN environment_members em ON e.id = em.environment_id
      WHERE e.user_id = ${userId} OR em.user_id = ${userId}
    `;

        const completedResult = await this.prisma.$queryRaw<[{ completed: bigint }]>`
      SELECT COUNT(DISTINCT c.id) as completed
      FROM cards c
      INNER JOIN boards b ON c.board_id = b.id
      INNER JOIN environments e ON b.environment_id = e.id
      LEFT JOIN environment_members em ON e.id = em.environment_id
      WHERE (e.user_id = ${userId} OR em.user_id = ${userId})
        AND c.completed = 1
    `;

        return {
            total: Number(totalResult[0]?.total || 0),
            completed: Number(completedResult[0]?.completed || 0),
        };
    }

    private async getCardsLast7Days(
        userId: string,
    ): Promise<{ created: number; completed: number }> {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const createdResult = await this.prisma.$queryRaw<[{ created: bigint }]>`
      SELECT COUNT(DISTINCT c.id) as created
      FROM cards c
      INNER JOIN boards b ON c.board_id = b.id
      INNER JOIN environments e ON b.environment_id = e.id
      LEFT JOIN environment_members em ON e.id = em.environment_id
      WHERE (e.user_id = ${userId} OR em.user_id = ${userId})
        AND c.created_at >= ${sevenDaysAgo}
    `;

        const completedResult = await this.prisma.$queryRaw<[{ completed: bigint }]>`
      SELECT COUNT(DISTINCT c.id) as completed
      FROM cards c
      INNER JOIN boards b ON c.board_id = b.id
      INNER JOIN environments e ON b.environment_id = e.id
      LEFT JOIN environment_members em ON e.id = em.environment_id
      WHERE (e.user_id = ${userId} OR em.user_id = ${userId})
        AND c.created_at >= ${sevenDaysAgo}
        AND c.completed = 1
    `;

        return {
            created: Number(createdResult[0]?.created || 0),
            completed: Number(completedResult[0]?.completed || 0),
        };
    }

    private async getOverdueTasks(userId: string): Promise<number> {
        const now = new Date();
        const result = await this.prisma.$queryRaw<[{ overdue: bigint }]>`
      SELECT COUNT(DISTINCT c.id) as overdue
      FROM cards c
      INNER JOIN boards b ON c.board_id = b.id
      INNER JOIN environments e ON b.environment_id = e.id
      LEFT JOIN environment_members em ON e.id = em.environment_id
      WHERE (e.user_id = ${userId} OR em.user_id = ${userId})
        AND c.completed = 0
        AND c.due_date IS NOT NULL
        AND c.due_date < ${now}
    `;
        return Number(result[0]?.overdue || 0);
    }

    private async getTasksDueSoon(userId: string): Promise<number> {
        const now = new Date();
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const result = await this.prisma.$queryRaw<[{ dueSoon: bigint }]>`
      SELECT COUNT(DISTINCT c.id) as dueSoon
      FROM cards c
      INNER JOIN boards b ON c.board_id = b.id
      INNER JOIN environments e ON b.environment_id = e.id
      LEFT JOIN environment_members em ON e.id = em.environment_id
      WHERE (e.user_id = ${userId} OR em.user_id = ${userId})
        AND c.completed = 0
        AND c.due_date IS NOT NULL
        AND c.due_date >= ${now}
        AND c.due_date <= ${threeDaysFromNow}
    `;
        return Number(result[0]?.dueSoon || 0);
    }

    private async getTotalComments(userId: string): Promise<number> {
        const result = await this.prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COUNT(*) as total
      FROM comments
      WHERE user_id = ${userId}
    `;
        return Number(result[0]?.total || 0);
    }

    private async getRecentActivity(userId: string): Promise<ActivityItem[]> {
        // Usar GROUP BY para evitar duplicatas em vez de DISTINCT
        const activities = await this.prisma.$queryRaw<
            Array<{
                id: string;
                action: string;
                details: string | null;
                created_at: Date;
                card_title: string | null;
            }>
        >`
      SELECT 
        al.id,
        al.action,
        al.details,
        al.created_at,
        c.title as card_title
      FROM activity_logs al
      INNER JOIN cards c ON al.card_id = c.id
      INNER JOIN boards b ON c.board_id = b.id
      INNER JOIN environments e ON b.environment_id = e.id
      LEFT JOIN environment_members em ON e.id = em.environment_id
      WHERE (e.user_id = ${userId} OR em.user_id = ${userId})
      GROUP BY al.id, al.action, al.details, al.created_at, c.title
      ORDER BY al.created_at DESC
      LIMIT 3
    `;

        // Traduzir ações para português
        const actionTranslations: Record<string, string> = {
            CREATED: 'Criou',
            UPDATED: 'Atualizou',
            MOVED: 'Moveu',
            DELETED: 'Excluiu',
            COMPLETED: 'Concluiu',
        };

        return activities.map((a) => ({
            id: a.id,
            action: actionTranslations[a.action] || a.action,
            details: a.details,
            createdAt: a.created_at,
            cardTitle: a.card_title || undefined,
        }));
    }

    private async getCardsByBoard(userId: string): Promise<BoardMetric[]> {
        const boards = await this.prisma.$queryRaw<
            Array<{
                board_id: string;
                board_name: string;
                card_count: bigint;
            }>
        >`
      SELECT 
        b.id as board_id,
        b.name as board_name,
        COUNT(DISTINCT c.id) as card_count
      FROM boards b
      INNER JOIN cards c ON b.id = c.board_id
      INNER JOIN environments e ON b.environment_id = e.id
      LEFT JOIN environment_members em ON e.id = em.environment_id
      WHERE e.user_id = ${userId} OR em.user_id = ${userId}
      GROUP BY b.id, b.name
      ORDER BY card_count DESC
      LIMIT 5
    `;

        return boards.map((b) => ({
            boardId: b.board_id,
            boardName: b.board_name,
            cardCount: Number(b.card_count),
        }));
    }

    private async getCardsByLabel(userId: string): Promise<LabelMetric[]> {
        const labels = await this.prisma.$queryRaw<
            Array<{
                label_id: string;
                label_name: string;
                label_color: string;
                card_count: bigint;
            }>
        >`
      SELECT 
        l.id as label_id,
        l.name as label_name,
        l.color as label_color,
        COUNT(DISTINCT cl.A) as card_count
      FROM labels l
      INNER JOIN _CardToLabel cl ON l.id = cl.B
      INNER JOIN cards c ON cl.A = c.id
      INNER JOIN boards b ON c.board_id = b.id
      INNER JOIN environments e ON b.environment_id = e.id
      LEFT JOIN environment_members em ON e.id = em.environment_id
      WHERE (e.user_id = ${userId} OR em.user_id = ${userId})
      GROUP BY l.id, l.name, l.color
      ORDER BY card_count DESC
      LIMIT 5
    `;

        return labels.map((l) => ({
            labelId: l.label_id,
            labelName: l.label_name,
            labelColor: l.label_color,
            cardCount: Number(l.card_count),
        }));
    }
}
