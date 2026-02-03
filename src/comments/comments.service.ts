import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
    constructor(private prisma: PrismaService) { }

    async create(userId: string, createCommentDto: CreateCommentDto) {
        const { cardId, content } = createCommentDto;
        // Check card existence
        const card = await this.prisma.card.findUnique({ where: { id: cardId } });
        if (!card) throw new NotFoundException('Card not found');

        const comment = await this.prisma.comment.create({
            data: {
                content,
                cardId,
                userId,
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
        });

        return {
            ...comment,
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
        };
    }

    async findAllByCard(cardId: string) {
        const comments = await this.prisma.comment.findMany({
            where: { cardId },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return comments.map(comment => ({
            ...comment,
            createdAt: comment.createdAt.toISOString(),
            updatedAt: comment.updatedAt.toISOString(),
        }));
    }

    async remove(id: string, userId: string) {
        const comment = await this.prisma.comment.findUnique({ where: { id } });
        if (!comment) throw new NotFoundException('Comment not found');

        // Only author can delete (or admin, but simplified here)
        // if (comment.userId !== userId) throw new ForbiddenException('Not allowed');

        return this.prisma.comment.delete({ where: { id } });
    }
}
