import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { BoardsService } from './boards.service';
import { PrismaService } from '../prisma/prisma.service';
import { Board } from '@prisma/client';

describe('BoardsService', () => {
  let service: BoardsService;
  let prisma: PrismaService;

  const mockBoard: Board = {
    id: 'board-1',
    environmentId: 'env-1',
    name: 'To Do',
    description: null,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BoardsService>(BoardsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEnvironmentId', () => {
    it('should return boards for user environment', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue({ id: 'env-1' });
      mockPrisma.board.findMany.mockResolvedValue([
        { ...mockBoard, _count: { cards: 2 } },
      ]);
      const result = await service.findByEnvironmentId('env-1', 'user-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('To Do');
      expect(result[0].cardsCount).toBe(2);
    });

    it('should throw NotFoundException when environment does not belong to user', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue(null);
      await expect(
        service.findByEnvironmentId('env-1', 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create board and return response', async () => {
      mockPrisma.environment.findFirst.mockResolvedValue({ id: 'env-1' });
      mockPrisma.board.count.mockResolvedValue(0);
      mockPrisma.board.create.mockResolvedValue(mockBoard);
      const result = await service.create('user-1', {
        name: 'To Do',
        environmentId: 'env-1',
      });
      expect(result.name).toBe('To Do');
      expect(result.environmentId).toBe('env-1');
      expect(prisma.board.create).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should throw NotFoundException when board does not belong to user', async () => {
      mockPrisma.board.findFirst.mockResolvedValue(null);
      await expect(service.remove('board-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
