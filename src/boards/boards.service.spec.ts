/**
 * ============================================================
 * TESTES UNITÁRIOS — BoardsService
 * ============================================================
 *
 * O BoardsService depende de:
 *   - PrismaService (banco de dados)
 *   - EventsGateway (WebSocket — emite eventos em tempo real)
 *   - CacheManager (cache em memória)
 *
 * Todos são mockados para isolar a lógica do service.
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { BoardsService } from './boards.service';
import { PrismaService } from '../prisma/prisma.service';
import { EventsGateway } from '../events/events.gateway';

// ─── Dados de exemplo ────────────────────────────────────────
const mockBoard = {
  id: 'board-1',
  environmentId: 'env-1',
  name: 'To Do',
  slug: 'to-do',
  description: null,
  position: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Mocks ───────────────────────────────────────────────────
const mockPrisma = {
  environment: {
    findFirst: jest.fn(),
  },
  board: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
};

// EventsGateway emite eventos WebSocket — não precisamos testar
// os eventos aqui, apenas garantir que não causam erros
const mockEventsGateway = {
  emitBoardCreated: jest.fn(),
  emitBoardUpdated: jest.fn(),
  emitBoardDeleted: jest.fn(),
};

// CacheManager armazena resultados em memória para performance
const mockCacheManager = {
  get: jest.fn().mockResolvedValue(null), // sempre retorna cache vazio
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
};

// ─── Suite de testes ─────────────────────────────────────────
describe('BoardsService', () => {
  let service: BoardsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EventsGateway, useValue: mockEventsGateway },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    service = module.get<BoardsService>(BoardsService);
    jest.clearAllMocks();
    // Cache sempre vazio por padrão nos testes
    mockCacheManager.get.mockResolvedValue(null);
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  // ─── findByEnvironmentId ──────────────────────────────────
  describe('findByEnvironmentId', () => {
    it('deve retornar boards do ambiente com contagem de cards', async () => {
      // Arrange
      mockPrisma.environment.findFirst.mockResolvedValue({ id: 'env-1' });
      mockPrisma.board.findMany.mockResolvedValue([
        { ...mockBoard, _count: { cards: 3 } },
      ]);

      // Act
      const result = await service.findByEnvironmentId('env-1', 'user-1');

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('To Do');
      expect(result[0].cardsCount).toBe(3);
    });

    it('deve lançar NotFoundException quando ambiente não pertence ao usuário', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue(null);

      await expect(
        service.findByEnvironmentId('env-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve retornar cache quando disponível', async () => {
      const cachedBoards = [{ id: 'board-1', name: 'Cached', slug: 'cached', position: 0, environmentId: 'env-1' }];
      mockCacheManager.get.mockResolvedValue(cachedBoards);
      mockPrisma.environment.findFirst.mockResolvedValue({ id: 'env-1' });

      const result = await service.findByEnvironmentId('env-1', 'user-1');

      expect(result).toEqual(cachedBoards);
      // Não deve consultar o banco quando há cache
      expect(mockPrisma.board.findMany).not.toHaveBeenCalled();
    });
  });

  // ─── create ───────────────────────────────────────────────
  describe('create', () => {
    it('deve criar board e retornar resposta', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue({ id: 'env-1' });
      mockPrisma.board.count.mockResolvedValue(0);
      mockPrisma.board.findMany.mockResolvedValue([]); // sem slugs existentes
      mockPrisma.board.create.mockResolvedValue(mockBoard);

      const result = await service.create('user-1', {
        name: 'To Do',
        environmentId: 'env-1',
      });

      expect(result.name).toBe('To Do');
      expect(result.environmentId).toBe('env-1');
      expect(mockPrisma.board.create).toHaveBeenCalled();
    });

    it('deve lançar NotFoundException quando ambiente não existe', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', { name: 'Board', environmentId: 'env-inexistente' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── update ───────────────────────────────────────────────
  describe('update', () => {
    it('deve atualizar board com sucesso', async () => {
      const boardWithEnv = {
        ...mockBoard,
        environment: {
          userId: 'user-1',
          id: 'env-1',
          members: [],
        },
        _count: { cards: 0 },
      };
      mockPrisma.board.findFirst.mockResolvedValue(boardWithEnv);
      mockPrisma.board.findMany.mockResolvedValue([]); // para slug
      mockPrisma.board.update.mockResolvedValue({ ...mockBoard, name: 'Em Progresso', slug: 'em-progresso' });

      const result = await service.update('board-1', 'user-1', { name: 'Em Progresso' });

      expect(result.name).toBe('Em Progresso');
    });

    it('deve lançar NotFoundException quando board não existe', async () => {
      mockPrisma.board.findFirst.mockResolvedValue(null);

      await expect(
        service.update('board-inexistente', 'user-1', { name: 'Novo Nome' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ───────────────────────────────────────────────
  describe('remove', () => {
    it('deve deletar board com sucesso', async () => {
      const boardWithEnv = {
        ...mockBoard,
        environment: {
          userId: 'user-1',
          id: 'env-1',
          members: [],
        },
        _count: { cards: 0 },
      };
      mockPrisma.board.findFirst.mockResolvedValue(boardWithEnv);
      mockPrisma.board.delete.mockResolvedValue(mockBoard);

      await service.remove('board-1', 'user-1');

      expect(mockPrisma.board.delete).toHaveBeenCalledWith({ where: { id: 'board-1' } });
    });

    it('deve lançar NotFoundException quando board não pertence ao usuário', async () => {
      mockPrisma.board.findFirst.mockResolvedValue(null);

      await expect(service.remove('board-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
