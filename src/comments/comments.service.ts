import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UploadService } from '../common/services/upload.service';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) { }

  async create(userId: string, createCommentDto: CreateCommentDto, file?: Express.Multer.File) {
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

    let attachmentData = null;
    if (file) {
      const { url, key } = await this.uploadService.uploadFile(file, 'comments');
      attachmentData = {
        url,
        key,
        filename: file.originalname,
        type: file.mimetype,
      };
    }

    const comment = await this.prisma.comment.create({
      data: {
        content,
        cardId,
        userId,
        attachments: attachmentData ? { create: attachmentData } : undefined,
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
        attachments: true,
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
        attachments: true,
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

    // Delete attachments from S3 if any
    const commentWithAttachments = await this.prisma.comment.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (commentWithAttachments?.attachments) {
      for (const attachment of commentWithAttachments.attachments) {
        if (attachment.key) {
          // We do not await here to not block the response if S3 is slow, 
          // but for reliability it might be better to await. 
          // Given the task is "optimized", firing and forgetting or awaiting are both valid choices depending on consistency requirements.
          // I'll await to ensure cleanups.
          await this.uploadService.deleteFile(attachment.key).catch(e => console.error(`Failed to delete file ${attachment.key}`, e));
        }
      }
    }

    return this.prisma.comment.delete({ where: { id } });
  }

  async getAttachmentDownloadUrl(attachmentId: string, userId: string) {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      include: {
        comment: {
          include: {
            card: {
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
            },
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Anexo não encontrado');
    }

    // Verify access
    const environment = attachment.comment.card.board.environment;
    const isOwner = environment.userId === userId;
    const isMember = environment.members.length > 0;

    if (!isOwner && !isMember) {
      throw new ForbiddenException('Você não tem permissão para acessar este anexo');
    }

    if (!attachment.key) {
      throw new NotFoundException('Arquivo não encontrado no armazenamento');
    }

    const fileStream = await this.uploadService.downloadFile(attachment.key);

    return {
      stream: fileStream.Body,
      contentType: fileStream.ContentType,
      filename: attachment.filename
    };
  }
}
