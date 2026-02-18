import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogsService } from './activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  activityLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

describe('ActivityLogsService', () => {
  let service: ActivityLogsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityLogsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ActivityLogsService>(ActivityLogsService);
    jest.clearAllMocks();
  });

  it('deve ser definido', () => {
    expect(service).toBeDefined();
  });

  describe('logAction', () => {
    it('deve registrar uma ação no banco de dados', async () => {
      const mockLog = {
        id: 'log-1',
        cardId: 'card-1',
        userId: 'user-1',
        action: 'CREATED',
        details: 'Card criado',
        createdAt: new Date(),
      };
      mockPrisma.activityLog.create.mockResolvedValue(mockLog);

      const result = await service.logAction('card-1', 'user-1', 'CREATED', 'Card criado');

      expect(result).toEqual(mockLog);
      expect(mockPrisma.activityLog.create).toHaveBeenCalledWith({
        data: {
          cardId: 'card-1',
          userId: 'user-1',
          action: 'CREATED',
          details: 'Card criado',
        },
      });
    });
  });

  describe('getByCardId', () => {
    it('deve retornar logs de atividade de um card', async () => {
      const createdAt = new Date('2024-01-01T10:00:00Z');
      mockPrisma.activityLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          cardId: 'card-1',
          userId: 'user-1',
          action: 'CREATED',
          details: 'Card criado',
          createdAt,
          user: { id: 'user-1', name: 'João', avatar: null },
        },
      ]);

      const result = await service.getByCardId('card-1');

      expect(result).toHaveLength(1);
      expect(result[0].action).toBe('CREATED');
      expect(result[0].createdAt).toBe(createdAt.toISOString());
    });
  });
});
