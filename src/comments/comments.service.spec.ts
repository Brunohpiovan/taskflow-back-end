/**
 * ============================================================
 * TESTES UNITÁRIOS — CommentsService
 * ============================================================
 *
 * O CommentsService depende de:
 *   - PrismaService (banco de dados)
 *   - UploadService (upload de arquivos para S3)
 *
 * Regras de negócio testadas:
 *   - Apenas membros do ambiente podem comentar
 *   - Apenas o autor ou OWNER do ambiente pode deletar comentário
 *   - Upload de arquivo é opcional ao criar comentário
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../common/services/upload.service';

// ─── Dados de exemplo ────────────────────────────────────────
const mockComment = {
  id: 'comment-1',
  content: 'Ótimo trabalho!',
  cardId: 'card-1',
  userId: 'user-1',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  user: { name: 'João', avatar: null },
  attachments: [],
};

// Card com ambiente onde user-1 é o dono
const mockCardWithOwner = {
  id: 'card-1',
  board: {
    environment: {
      userId: 'user-1', // user-1 é o dono
      members: [],
    },
  },
};

// Card com ambiente onde user-2 é membro
const mockCardWithMember = {
  id: 'card-1',
  board: {
    environment: {
      userId: 'user-owner',
      members: [{ userId: 'user-2' }], // user-2 é membro
    },
  },
};

// ─── Mocks ───────────────────────────────────────────────────
const mockPrisma = {
  card: { findUnique: jest.fn() },
  comment: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  attachment: { findUnique: jest.fn() },
};

const mockUploadService = {
  uploadFile: jest.fn(),
  deleteFile: jest.fn(),
  downloadFile: jest.fn(),
};

// ─── Suite de testes ─────────────────────────────────────────
describe('CommentsService', () => {
  let service: CommentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: UploadService, useValue: mockUploadService },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  // ─── create ───────────────────────────────────────────────
  describe('create', () => {
    it('deve lançar NotFoundException quando card não existe', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(null);

      await expect(
        service.create('user-1', { cardId: 'card-inexistente', content: 'Olá' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve lançar ForbiddenException quando usuário não é membro do ambiente', async () => {
      // Card existe mas user-3 não é dono nem membro
      mockPrisma.card.findUnique.mockResolvedValue({
        id: 'card-1',
        board: {
          environment: {
            userId: 'user-owner',
            members: [], // user-3 não está aqui
          },
        },
      });

      await expect(
        service.create('user-3', { cardId: 'card-1', content: 'Olá' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deve criar comentário sem arquivo com sucesso (dono do ambiente)', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(mockCardWithOwner);
      mockPrisma.comment.create.mockResolvedValue(mockComment);

      const result = await service.create('user-1', {
        cardId: 'card-1',
        content: 'Ótimo trabalho!',
      });

      expect(result.content).toBe('Ótimo trabalho!');
      expect(result.createdAt).toBe('2024-01-01T10:00:00.000Z');
      expect(mockPrisma.comment.create).toHaveBeenCalled();
    });

    it('deve criar comentário sem arquivo com sucesso (membro do ambiente)', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(mockCardWithMember);
      mockPrisma.comment.create.mockResolvedValue(mockComment);

      const result = await service.create('user-2', {
        cardId: 'card-1',
        content: 'Ótimo trabalho!',
      });

      expect(result.content).toBe('Ótimo trabalho!');
    });

    it('deve fazer upload do arquivo e criar comentário com anexo', async () => {
      mockPrisma.card.findUnique.mockResolvedValue(mockCardWithOwner);
      mockUploadService.uploadFile.mockResolvedValue({
        url: 'https://s3.example.com/file.pdf',
        key: 'comments/file.pdf',
      });
      mockPrisma.comment.create.mockResolvedValue({
        ...mockComment,
        attachments: [{ id: 'att-1', url: 'https://s3.example.com/file.pdf' }],
      });

      const mockFile = {
        originalname: 'documento.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from(''),
        size: 1000,
      } as Express.Multer.File;

      const result = await service.create(
        'user-1',
        { cardId: 'card-1', content: 'Segue o arquivo' },
        mockFile,
      );

      expect(mockUploadService.uploadFile).toHaveBeenCalledWith(mockFile, 'comments');
      expect(result.attachments).toHaveLength(1);
    });
  });

  // ─── findAllByCard ────────────────────────────────────────
  describe('findAllByCard', () => {
    it('deve retornar lista de comentários do card', async () => {
      mockPrisma.comment.findMany.mockResolvedValue([mockComment]);

      const result = await service.findAllByCard('card-1');

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Ótimo trabalho!');
      // Verifica que a data foi convertida para string ISO
      expect(typeof result[0].createdAt).toBe('string');
    });

    it('deve retornar lista vazia quando não há comentários', async () => {
      mockPrisma.comment.findMany.mockResolvedValue([]);

      const result = await service.findAllByCard('card-sem-comentarios');

      expect(result).toHaveLength(0);
    });
  });

  // ─── remove ───────────────────────────────────────────────
  describe('remove', () => {
    it('deve lançar NotFoundException quando comentário não existe', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue(null);

      await expect(service.remove('comment-inexistente', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ForbiddenException quando usuário não é autor nem owner', async () => {
      mockPrisma.comment.findUnique.mockResolvedValue({
        ...mockComment,
        userId: 'user-autor', // autor é outro usuário
        card: {
          board: {
            environment: {
              userId: 'user-dono', // dono é outro usuário
              members: [{ userId: 'user-3', role: 'MEMBER' }], // user-3 é membro comum
            },
          },
        },
      });

      await expect(service.remove('comment-1', 'user-3')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('deve deletar comentário quando usuário é o autor', async () => {
      mockPrisma.comment.findUnique
        .mockResolvedValueOnce({
          ...mockComment,
          userId: 'user-1', // user-1 é o autor
          card: {
            board: {
              environment: {
                userId: 'user-dono',
                members: [],
              },
            },
          },
        })
        .mockResolvedValueOnce({ ...mockComment, attachments: [] }); // segunda chamada para buscar anexos

      mockPrisma.comment.delete.mockResolvedValue(mockComment);

      await service.remove('comment-1', 'user-1');

      expect(mockPrisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
      });
    });

    it('deve deletar comentário quando usuário é OWNER do ambiente', async () => {
      mockPrisma.comment.findUnique
        .mockResolvedValueOnce({
          ...mockComment,
          userId: 'user-autor', // outro usuário é o autor
          card: {
            board: {
              environment: {
                userId: 'user-owner',
                members: [{ userId: 'user-owner', role: 'OWNER' }], // user-owner é OWNER
              },
            },
          },
        })
        .mockResolvedValueOnce({ ...mockComment, attachments: [] });

      mockPrisma.comment.delete.mockResolvedValue(mockComment);

      await service.remove('comment-1', 'user-owner');

      expect(mockPrisma.comment.delete).toHaveBeenCalled();
    });
  });
});
