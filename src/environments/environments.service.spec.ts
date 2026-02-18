/**
 * ============================================================
 * TESTES UNITÁRIOS — EnvironmentsService
 * ============================================================
 *
 * O EnvironmentsService gerencia ambientes (workspaces).
 * Depende apenas do PrismaService.
 *
 * Regras de negócio testadas:
 *   - findAll retorna ambientes do usuário (como dono ou membro)
 *   - findBySlug lança NotFoundException quando não encontrado
 *   - create adiciona o criador como OWNER via transação
 *   - update e remove exigem que o usuário seja OWNER
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { EnvironmentsService } from './environments.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Dados de exemplo ────────────────────────────────────────
const mockEnvironment = {
    id: 'env-1',
    slug: 'meu-ambiente',
    name: 'Meu Ambiente',
    description: 'Descrição do ambiente',
    userId: 'user-1',
    _count: { boards: 2 },
    boards: [
        { _count: { cards: 3 } },
        { _count: { cards: 1 } },
    ],
};

// ─── Mock do PrismaService ───────────────────────────────────
const mockPrisma = {
    environment: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    },
    environmentMember: {
        findUnique: jest.fn(),
        create: jest.fn(),
    },
    // $transaction simula uma transação do banco
    // Recebe uma função e a executa com um "tx" (transaction client)
    $transaction: jest.fn(),
};

// ─── Suite de testes ─────────────────────────────────────────
describe('EnvironmentsService', () => {
    let service: EnvironmentsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EnvironmentsService,
                { provide: PrismaService, useValue: mockPrisma },
            ],
        }).compile();

        service = module.get<EnvironmentsService>(EnvironmentsService);
        jest.clearAllMocks();
    });

    it('deve ser definido', () => {
        expect(service).toBeDefined();
    });

    // ─── findAll ──────────────────────────────────────────────
    describe('findAll', () => {
        it('deve retornar ambientes do usuário com contagens', async () => {
            mockPrisma.environment.findMany.mockResolvedValue([mockEnvironment]);

            const result = await service.findAll('user-1');

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Meu Ambiente');
            expect(result[0].boardsCount).toBe(2);
            expect(result[0].cardsCount).toBe(4); // 3 + 1
        });

        it('deve retornar lista vazia quando usuário não tem ambientes', async () => {
            mockPrisma.environment.findMany.mockResolvedValue([]);

            const result = await service.findAll('user-sem-ambientes');

            expect(result).toHaveLength(0);
        });
    });

    // ─── findBySlug ───────────────────────────────────────────
    describe('findBySlug', () => {
        it('deve retornar ambiente quando encontrado pelo slug', async () => {
            mockPrisma.environment.findFirst.mockResolvedValue(mockEnvironment);

            const result = await service.findBySlug('meu-ambiente', 'user-1');

            expect(result.slug).toBe('meu-ambiente');
            expect(result.name).toBe('Meu Ambiente');
        });

        it('deve lançar NotFoundException quando slug não existe', async () => {
            mockPrisma.environment.findFirst.mockResolvedValue(null);

            await expect(
                service.findBySlug('slug-inexistente', 'user-1'),
            ).rejects.toThrow(NotFoundException);
        });
    });

    // ─── create ───────────────────────────────────────────────
    describe('create', () => {
        it('deve criar ambiente e adicionar criador como OWNER', async () => {
            // Arrange: sem slugs existentes
            mockPrisma.environment.findMany.mockResolvedValue([]);

            // Simula a transação: executa a função passada com um tx mock
            mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
                const txMock = {
                    environment: {
                        create: jest.fn().mockResolvedValue({
                            id: 'env-novo',
                            slug: 'novo-ambiente',
                            name: 'Novo Ambiente',
                            description: null,
                        }),
                    },
                    environmentMember: {
                        create: jest.fn().mockResolvedValue({}),
                    },
                };
                return fn(txMock);
            });

            // Act
            const result = await service.create('user-1', { name: 'Novo Ambiente' });

            // Assert
            expect(result.name).toBe('Novo Ambiente');
            expect(result.slug).toBe('novo-ambiente');

            // Verifica que a transação foi usada (garante atomicidade)
            expect(mockPrisma.$transaction).toHaveBeenCalled();
        });
    });

    // ─── update ───────────────────────────────────────────────
    describe('update', () => {
        it('deve lançar NotFoundException quando ambiente não existe', async () => {
            // findOneOrThrow retorna null → NotFoundException
            mockPrisma.environment.findFirst.mockResolvedValue(null);

            await expect(
                service.update('env-inexistente', 'user-1', { name: 'Novo Nome' }),
            ).rejects.toThrow(NotFoundException);
        });

        it('deve lançar ForbiddenException quando usuário não é OWNER', async () => {
            // Ambiente existe e user-2 tem acesso como membro
            mockPrisma.environment.findFirst.mockResolvedValue(mockEnvironment);

            // Mas user-2 não é OWNER
            mockPrisma.environmentMember.findUnique.mockResolvedValue({
                role: 'MEMBER', // não é OWNER
            });
            mockPrisma.environment.findUnique.mockResolvedValue({
                ...mockEnvironment,
                userId: 'user-1', // dono é user-1, não user-2
            });

            await expect(
                service.update('env-1', 'user-2', { name: 'Novo Nome' }),
            ).rejects.toThrow(ForbiddenException);
        });

        it('deve atualizar ambiente com sucesso quando usuário é OWNER', async () => {
            mockPrisma.environment.findFirst.mockResolvedValue(mockEnvironment);

            // user-1 é o dono legado (userId === user-1)
            mockPrisma.environmentMember.findUnique.mockResolvedValue(null);
            mockPrisma.environment.findUnique.mockResolvedValue({
                ...mockEnvironment,
                userId: 'user-1',
            });

            // Para atualização do slug
            mockPrisma.environment.findMany.mockResolvedValue([]);
            mockPrisma.environment.update.mockResolvedValue({
                ...mockEnvironment,
                name: 'Ambiente Atualizado',
                slug: 'ambiente-atualizado',
            });

            const result = await service.update('env-1', 'user-1', {
                name: 'Ambiente Atualizado',
            });

            expect(result.name).toBe('Ambiente Atualizado');
        });
    });

    // ─── remove ───────────────────────────────────────────────
    describe('remove', () => {
        it('deve lançar NotFoundException quando ambiente não existe', async () => {
            mockPrisma.environment.findFirst.mockResolvedValue(null);

            await expect(service.remove('env-inexistente', 'user-1')).rejects.toThrow(
                NotFoundException,
            );
        });

        it('deve lançar ForbiddenException quando usuário não é OWNER', async () => {
            mockPrisma.environment.findFirst.mockResolvedValue(mockEnvironment);
            mockPrisma.environmentMember.findUnique.mockResolvedValue({ role: 'MEMBER' });
            mockPrisma.environment.findUnique.mockResolvedValue({
                ...mockEnvironment,
                userId: 'user-1', // dono é outro
            });

            await expect(service.remove('env-1', 'user-2')).rejects.toThrow(
                ForbiddenException,
            );
        });

        it('deve deletar ambiente com sucesso quando usuário é OWNER', async () => {
            mockPrisma.environment.findFirst.mockResolvedValue(mockEnvironment);
            mockPrisma.environmentMember.findUnique.mockResolvedValue(null);
            mockPrisma.environment.findUnique.mockResolvedValue({
                ...mockEnvironment,
                userId: 'user-1',
            });
            mockPrisma.environment.delete.mockResolvedValue(mockEnvironment);

            await service.remove('env-1', 'user-1');

            expect(mockPrisma.environment.delete).toHaveBeenCalledWith({
                where: { id: 'env-1' },
            });
        });
    });
});
