import { Test, TestingModule } from '@nestjs/testing';
import { ActivityLogsService } from './activity-logs.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  activityLog: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
};

const makeLog = (id: string, createdAt = new Date()) => ({
  id,
  cardId: 'card-1',
  userId: 'user-1',
  action: 'CREATED',
  details: 'Card criado',
  createdAt,
  user: { id: 'user-1', name: 'João', avatar: null },
});

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

  // ─── logAction ──────────────────────────────────────────────
  describe('logAction', () => {
    it('deve registrar uma ação no banco de dados', async () => {
      const mockLog = makeLog('log-1');
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

  // ─── getByCardId ─────────────────────────────────────────────
  describe('getByCardId', () => {
    it('deve retornar primeira página com nextCursor quando há mais itens', async () => {
      // 11 logs simulados para um limit=10 → deve retornar 10 + nextCursor
      const logs = Array.from({ length: 11 }, (_, i) => makeLog(`log-${i + 1}`));
      mockPrisma.activityLog.findMany.mockResolvedValue(logs);

      const result = await service.getByCardId('card-1', undefined, 10);

      expect(result.data).toHaveLength(10);
      expect(result.nextCursor).toBe('log-10'); // id do último item retornado
      expect(result.data[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/); // ISO string
    });

    it('deve retornar nextCursor null quando é a última página', async () => {
      // Apenas 5 logs — menos que o limit=10 → última página
      const logs = Array.from({ length: 5 }, (_, i) => makeLog(`log-${i + 1}`));
      mockPrisma.activityLog.findMany.mockResolvedValue(logs);

      const result = await service.getByCardId('card-1', undefined, 10);

      expect(result.data).toHaveLength(5);
      expect(result.nextCursor).toBeNull();
    });

    it('deve usar cursor ao buscar próxima página', async () => {
      const logs = [makeLog('log-11')];
      mockPrisma.activityLog.findMany.mockResolvedValue(logs);

      await service.getByCardId('card-1', 'log-10', 10);

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: 'log-10' },
          skip: 1,
        }),
      );
    });

    it('deve respeitar o limite máximo de 50 por request', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([]);

      await service.getByCardId('card-1', undefined, 200);

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 51 }), // 50 + 1 para detecção de próxima página
      );
    });

    it('deve retornar lista vazia quando não há logs', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([]);

      const result = await service.getByCardId('card-1');

      expect(result.data).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });
  });
});
