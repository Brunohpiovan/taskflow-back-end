import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) { }

  async create(userId: string, createCommentDto: CreateCommentDto) {
    const { cardId, content } = createCommentDto;

    // Verify card exists AND user is a member of the environment
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        board: {
          include: {
            environment: {
              select: {
                userId: true,
                members: { where: { userId }, select: { userId: true } },
              },
            },
          },
        },
      },
    });

    if (!card) {
      throw new NotFoundException('Card não encontrado');
    }

    // Verify membership
    const isOwner = card.board.environment.userId === userId;
    const isMember = card.board.environment.members.length > 0;

    if (!isOwner && !isMember) {
      throw new ForbiddenException(
        'Você não tem permissão para comentar neste card',
      );
    }

    const comment = await this.prisma.comment.create({
      data: {
        content,
        cardId,
        userId,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
    });

    return {
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    };
  }

  async findAllByCard(cardId: string) {
    const comments = await this.prisma.comment.findMany({
      where: { cardId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        userId: true,
        user: {
          select: {
            name: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map((comment) => ({
      ...comment,
      createdAt: comment.createdAt.toISOString(),
    }));
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        card: {
          include: {
            board: {
              include: {
                environment: {
                  select: {
                    userId: true,
                    members: { where: { userId }, select: { userId: true, role: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException('Comentário não encontrado');
    }

    // Verify if user is the author
    const isAuthor = comment.userId === userId;

    // Verify if user is OWNER of the environment
    const environment = comment.card.board.environment;
    const isLegacyOwner = environment.userId === userId;
    const member = environment.members[0];
    const isOwner = isLegacyOwner || (member && member.role === 'OWNER');

    if (!isAuthor && !isOwner) {
      throw new ForbiddenException(
        'Apenas o autor ou o dono do ambiente pode deletar este comentário',
      );
    }

    return this.prisma.comment.delete({ where: { id } });
  }
}
