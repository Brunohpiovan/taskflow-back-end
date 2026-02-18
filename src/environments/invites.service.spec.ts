/**
 * ============================================================
 * TESTES UNITÁRIOS — InvitesService
 * ============================================================
 *
 * O InvitesService gerencia convites para ambientes.
 * Depende de PrismaService e MailService.
 *
 * Regras de negócio testadas:
 *   create:
 *     - Apenas OWNER pode enviar convites
 *     - Email deve existir no sistema
 *     - Usuário não pode já ser membro
 *     - Convite duplicado é substituído
 *     - Email de convite é enviado
 *
 *   accept:
 *     - Token deve existir e ser PENDING
 *     - Convite não pode estar expirado
 *     - Email do usuário logado deve bater com o convite
 *     - Aceitar adiciona usuário como MEMBER via transação
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
    NotFoundException,
    ForbiddenException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { InvitesService } from './invites.service';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../services/mail.service';
import { InviteStatus, MemberRole } from '@prisma/client';

// ─── Dados de exemplo ────────────────────────────────────────
const mockEnvironment = {
    id: 'env-1',
    name: 'Meu Ambiente',
    slug: 'meu-ambiente',
    userId: 'user-owner',
    members: [
        { userId: 'user-owner', role: MemberRole.OWNER },
    ],
    user: { id: 'user-owner', name: 'Dono', email: 'dono@example.com' },
};

const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 7);

const mockInvite = {
    id: 'invite-1',
    token: 'token-valido',
    email: 'convidado@example.com',
    environmentId: 'env-1',
    status: InviteStatus.PENDING,
    expiresAt: futureDate,
    environment: { id: 'env-1', slug: 'meu-ambiente' },
};

// ─── Mocks ───────────────────────────────────────────────────
const mockPrisma = {
    environment: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    invite: {
        deleteMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
    },
    environmentMember: { create: jest.fn() },
    $transaction: jest.fn(),
};

const mockMailService = {
    sendInviteEmail: jest.fn(),
};

// ─── Suite de testes ─────────────────────────────────────────
describe('InvitesService', () => {
    let service: InvitesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InvitesService,
                { provide: PrismaService, useValue: mockPrisma },
                { provide: MailService, useValue: mockMailService },
            ],
        }).compile();

        service = module.get<InvitesService>(InvitesService);
        jest.clearAllMocks();
    });

    it('deve ser definido', () => {
        expect(service).toBeDefined();
    });

    // ─── create ───────────────────────────────────────────────
    describe('create', () => {
        it('deve lançar NotFoundException quando ambiente não existe', async () => {
            mockPrisma.environment.findUnique.mockResolvedValue(null);

            await expect(
                service.create('env-inexistente', 'convidado@example.com', 'user-owner'),
            ).rejects.toThrow(NotFoundException);
        });

        it('deve lançar ForbiddenException quando usuário não é OWNER', async () => {
            mockPrisma.environment.findUnique.mockResolvedValue({
                ...mockEnvironment,
                userId: 'user-owner',
                members: [
                    { userId: 'user-membro', role: MemberRole.MEMBER }, // user-membro não é OWNER
                ],
            });

            await expect(
                service.create('env-1', 'convidado@example.com', 'user-membro'),
            ).rejects.toThrow(ForbiddenException);
        });

        it('deve lançar NotFoundException quando email não existe no sistema', async () => {
            mockPrisma.environment.findUnique.mockResolvedValue(mockEnvironment);
            mockPrisma.user.findUnique.mockResolvedValue(null); // email não existe

            await expect(
                service.create('env-1', 'naoexiste@example.com', 'user-owner'),
            ).rejects.toThrow(NotFoundException);
        });

        it('deve lançar ConflictException quando usuário já é membro', async () => {
            mockPrisma.environment.findUnique.mockResolvedValue({
                ...mockEnvironment,
                members: [
                    { userId: 'user-owner', role: MemberRole.OWNER },
                    { userId: 'user-ja-membro', role: MemberRole.MEMBER },
                ],
            });
            mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-ja-membro', email: 'ja@example.com' });

            await expect(
                service.create('env-1', 'ja@example.com', 'user-owner'),
            ).rejects.toThrow(ConflictException);
        });

        it('deve criar convite e enviar email com sucesso', async () => {
            mockPrisma.environment.findUnique.mockResolvedValue(mockEnvironment);
            mockPrisma.user.findUnique
                .mockResolvedValueOnce({ id: 'user-convidado', email: 'convidado@example.com' }) // usuário a convidar
                .mockResolvedValueOnce({ id: 'user-owner', name: 'Dono' }); // quem está convidando
            mockPrisma.invite.deleteMany.mockResolvedValue({ count: 0 });
            mockPrisma.invite.create.mockResolvedValue(mockInvite);
            mockMailService.sendInviteEmail.mockResolvedValue(undefined);

            const result = await service.create('env-1', 'convidado@example.com', 'user-owner');

            expect(result.message).toBe('Convite enviado com sucesso');
            expect(mockMailService.sendInviteEmail).toHaveBeenCalledWith(
                'convidado@example.com',
                expect.any(String), // token UUID
                'Meu Ambiente',
                'Dono',
            );
        });
    });

    // ─── accept ───────────────────────────────────────────────
    describe('accept', () => {
        it('deve lançar NotFoundException quando token é inválido', async () => {
            mockPrisma.invite.findUnique.mockResolvedValue(null);

            await expect(
                service.accept('token-invalido', 'user-1'),
            ).rejects.toThrow(NotFoundException);
        });

        it('deve lançar BadRequestException quando convite já foi utilizado', async () => {
            mockPrisma.invite.findUnique.mockResolvedValue({
                ...mockInvite,
                status: InviteStatus.ACCEPTED, // já aceito
            });

            await expect(
                service.accept('token-valido', 'user-1'),
            ).rejects.toThrow(BadRequestException);
        });

        it('deve lançar BadRequestException quando convite está expirado', async () => {
            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 1); // ontem

            mockPrisma.invite.findUnique.mockResolvedValue({
                ...mockInvite,
                expiresAt: pastDate, // expirado
            });

            await expect(
                service.accept('token-expirado', 'user-1'),
            ).rejects.toThrow(BadRequestException);
        });

        it('deve lançar ForbiddenException quando email do usuário não bate com o convite', async () => {
            mockPrisma.invite.findUnique.mockResolvedValue(mockInvite); // convite para convidado@example.com
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'user-outro',
                email: 'outro@example.com', // email diferente do convite
            });

            await expect(
                service.accept('token-valido', 'user-outro'),
            ).rejects.toThrow(ForbiddenException);
        });

        it('deve aceitar convite e adicionar usuário como MEMBER', async () => {
            mockPrisma.invite.findUnique.mockResolvedValue(mockInvite);
            mockPrisma.user.findUnique.mockResolvedValue({
                id: 'user-convidado',
                email: 'convidado@example.com', // bate com o convite
            });

            // Simula a transação
            mockPrisma.$transaction.mockImplementation(async (fn: Function) => {
                const txMock = {
                    environmentMember: { create: jest.fn().mockResolvedValue({}) },
                    invite: { update: jest.fn().mockResolvedValue({}) },
                };
                return fn(txMock);
            });

            const result = await service.accept('token-valido', 'user-convidado');

            expect(result.message).toBe('Convite aceito com sucesso');
            expect(result.environmentSlug).toBe('meu-ambiente');
            expect(mockPrisma.$transaction).toHaveBeenCalled();
        });
    });
});
