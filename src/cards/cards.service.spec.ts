/**
 * ============================================================
 * TESTES UNITÁRIOS — CardsService
 * ============================================================
 *
 * O CardsService é o mais complexo do sistema. Depende de:
 *   - PrismaService (banco de dados)
 *   - BoardsService (verificar acesso ao board)
 *   - ActivityLogsService (registrar ações)
 *   - EventsGateway (emitir eventos WebSocket)
 *
 * Regras de negócio testadas:
 *   - findOne: card não encontrado, sem acesso ao ambiente
 *   - create: board não encontrado, sucesso
 *   - update: card não encontrado, sucesso
 *   - remove: card não encontrado, sucesso
 *   - findAllWithDueDate: ambiente não encontrado, sem acesso
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CardsService } from './cards.service';
import { PrismaService } from '../prisma/prisma.service';
import { BoardsService } from '../boards/boards.service';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { EventsGateway } from '../events/events.gateway';

// ─── Dados de exemplo ────────────────────────────────────────
const mockCard = {
    id: 'card-1',
    title: 'Implementar feature X',
    description: 'Descrição da feature',
    position: 0,
    boardId: 'board-1',
    dueDate: null,
    completed: false,
    labels: [],
    members: [],
};

// Card com informações do ambiente (para verificação de acesso)
const mockCardWithBoard = {
    ...mockCard,
    board: {
        environment: {
            userId: 'user-1',
            id: 'env-1',
        },
    },
};

// ─── Mocks ───────────────────────────────────────────────────
const mockPrisma = {
    card: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
    },
    board: {
        findUnique: jest.fn(),
    },
    environment: {
        findUnique: jest.fn(),
    },
    environmentMember: {
        findFirst: jest.fn(),
    },
};

// BoardsService verifica se o usuário tem acesso ao board
const mockBoardsService = {
    findOneForUser: jest.fn(),
};

// ActivityLogsService registra ações (fire-and-forget)
const mockActivityLogsService = {
    logAction: jest.fn().mockResolvedValue(undefined),
};

// EventsGateway emite eventos WebSocket em tempo real
const mockEventsGateway = {
    emitCardCreated: jest.fn(),
    emitCardUpdated: jest.fn(),
    emitCardDeleted: jest.fn(),
    emitCardMoved: jest.fn(),
};

// ─── Suite de testes ─────────────────────────────────────────
describe('CardsService', () => {
    let service: CardsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CardsService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: BoardsService, useValue: mockBoardsService },
                { provide: ActivityLogsService, useValue: mockActivityLogsService },
                { provide: EventsGateway, useValue: mockEventsGateway },
            ],
        }).compile();

        service = module.get<CardsService>(CardsService);
        jest.clearAllMocks();
    });

    it('deve ser definido', () => {
        expect(service).toBeDefined();
    });

    // ─── findOne ──────────────────────────────────────────────
    describe('findOne', () => {
        it('deve lançar NotFoundException quando card não existe', async () => {
            mockPrisma.card.findUnique.mockResolvedValue(null);

            await expect(service.findOne('card-inexistente', 'user-1')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('deve lançar NotFoundException quando usuário não tem acesso ao ambiente', async () => {
            // Card existe
            mockPrisma.card.findUnique.mockResolvedValue(mockCard);

            // Board existe mas usuário não tem acesso
            mockPrisma.board.findUnique.mockResolvedValue({
                environment: {
                    userId: 'user-dono',
                    members: [], // user-intruso não é membro
                },
            });

            await expect(service.findOne('card-1', 'user-intruso')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('deve retornar card quando usuário é dono do ambiente', async () => {
            mockPrisma.card.findUnique.mockResolvedValue(mockCard);
            mockPrisma.board.findUnique.mockResolvedValue({
                environment: {
                    userId: 'user-1', // user-1 é o dono
                    members: [],
                },
            });

            const result = await service.findOne('card-1', 'user-1');

            expect(result.id).toBe('card-1');
            expect(result.title).toBe('Implementar feature X');
        });
    });

    // ─── create ───────────────────────────────────────────────
    describe('create', () => {
        it('deve lançar NotFoundException quando board não existe ou sem acesso', async () => {
            // BoardsService lança NotFoundException quando board não existe
            mockBoardsService.findOneForUser.mockRejectedValue(
                new NotFoundException('Board não encontrado'),
            );

            await expect(
                service.create('user-1', {
                    title: 'Novo Card',
                    boardId: 'board-inexistente',
                }),
            ).rejects.toThrow(NotFoundException);
        });

        it('deve criar card com sucesso', async () => {
            mockBoardsService.findOneForUser.mockResolvedValue({
                id: 'board-1',
                environmentId: 'env-1',
                name: 'To Do',
                description: null,
                position: 0,
            });
            mockPrisma.card.count.mockResolvedValue(2); // posição = 2
            mockPrisma.card.create.mockResolvedValue(mockCard);
            mockPrisma.board.findUnique.mockResolvedValue({ environmentId: 'env-1' });

            const result = await service.create('user-1', {
                title: 'Implementar feature X',
                boardId: 'board-1',
            });

            expect(result.title).toBe('Implementar feature X');
            expect(result.boardId).toBe('board-1');
            expect(mockPrisma.card.create).toHaveBeenCalled();
        });
    });

    // ─── update ───────────────────────────────────────────────
    describe('update', () => {
        it('deve lançar NotFoundException quando card não existe', async () => {
            // findOneOrThrow retorna null
            mockPrisma.card.findUnique.mockResolvedValue(null);

            await expect(
                service.update('card-inexistente', 'user-1', { title: 'Novo Título' }),
            ).rejects.toThrow(NotFoundException);
        });

        it('deve atualizar card com sucesso', async () => {
            // findOneOrThrow encontra o card
            mockPrisma.card.findUnique.mockResolvedValue(mockCardWithBoard);
            mockPrisma.card.update.mockResolvedValue({
                ...mockCard,
                title: 'Título Atualizado',
            });
            mockPrisma.board.findUnique.mockResolvedValue({ environmentId: 'env-1' });

            const result = await service.update('card-1', 'user-1', {
                title: 'Título Atualizado',
            });

            expect(result.title).toBe('Título Atualizado');
            expect(mockPrisma.card.update).toHaveBeenCalled();
        });
    });

    // ─── remove ───────────────────────────────────────────────
    describe('remove', () => {
        it('deve lançar NotFoundException quando card não existe', async () => {
            mockPrisma.card.findUnique.mockResolvedValue(null);

            await expect(service.remove('card-inexistente', 'user-1')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('deve deletar card com sucesso', async () => {
            // Primeira chamada: findOneOrThrow
            mockPrisma.card.findUnique
                .mockResolvedValueOnce(mockCardWithBoard)
                // Segunda chamada: busca boardId antes de deletar
                .mockResolvedValueOnce({
                    boardId: 'board-1',
                    board: { environmentId: 'env-1' },
                });
            mockPrisma.card.delete.mockResolvedValue(mockCard);

            await service.remove('card-1', 'user-1');

            expect(mockPrisma.card.delete).toHaveBeenCalledWith({
                where: { id: 'card-1' },
            });
        });
    });

    // ─── findAllWithDueDate ───────────────────────────────────
    describe('findAllWithDueDate', () => {
        it('deve lançar NotFoundException quando ambiente não existe', async () => {
            mockPrisma.environment.findUnique.mockResolvedValue(null);

            await expect(
                service.findAllWithDueDate('env-inexistente', 'user-1'),
            ).rejects.toThrow(NotFoundException);
        });

        it('deve lançar NotFoundException quando usuário não tem acesso', async () => {
            mockPrisma.environment.findUnique.mockResolvedValue({
                userId: 'user-dono',
                members: [], // user-intruso não é membro
            });

            await expect(
                service.findAllWithDueDate('env-1', 'user-intruso'),
            ).rejects.toThrow(NotFoundException);
        });

        it('deve retornar cards com data de vencimento', async () => {
            const dueDate = new Date('2024-12-31');
            mockPrisma.environment.findUnique.mockResolvedValue({
                userId: 'user-1',
                members: [],
            });
            mockPrisma.card.findMany.mockResolvedValue([
                { id: 'card-1', title: 'Card com prazo', boardId: 'board-1', dueDate, completed: false },
            ]);

            const result = await service.findAllWithDueDate('env-1', 'user-1');

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Card com prazo');
            expect(result[0].dueDate).toBe(dueDate.toISOString());
        });
    });
});
