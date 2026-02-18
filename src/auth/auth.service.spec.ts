/**
 * ============================================================
 * TESTES UNITÁRIOS — AuthService
 * ============================================================
 *
 * O que é um teste unitário?
 * --------------------------
 * Um teste unitário verifica uma "unidade" de código isolada —
 * aqui, cada método do AuthService — sem depender de banco de
 * dados real, envio de email, etc.
 *
 * Como funciona?
 * --------------
 * Usamos "mocks": objetos falsos que simulam as dependências
 * (UsersService, JwtService, MailService...). Assim controlamos
 * exatamente o que cada dependência retorna em cada teste.
 *
 * Estrutura de um teste:
 *   describe('grupo') → agrupa testes relacionados
 *   it('deve fazer X')  → um teste individual
 *   expect(valor).toBe(esperado) → a verificação
 *
 * Padrão AAA (Arrange, Act, Assert):
 *   Arrange: preparar dados e mocks
 *   Act:     chamar o método sendo testado
 *   Assert:  verificar o resultado com expect()
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { MailService } from '../services/mail.service';
import { User } from '@prisma/client';

// ─── Dados de exemplo reutilizados nos testes ───────────────
const mockUser: User = {
  id: 'user-1',
  email: 'user@example.com',
  passwordHash: 'hashed',
  name: 'User',
  avatar: null,
  provider: null,
  providerId: null,
  resetPasswordToken: null,
  resetPasswordExpires: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Mocks das dependências ──────────────────────────────────
// Em vez de usar o UsersService real (que precisaria do banco),
// criamos um objeto falso com as mesmas funções usando jest.fn()
const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  findOrCreateByOAuth: jest.fn(),
  updateProfile: jest.fn(),
  updateResetToken: jest.fn(),
  findByResetToken: jest.fn(),
  updatePasswordAndClearToken: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('jwt-token'),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'jwt.secret') return 'secret';
    if (key === 'jwt.expiresIn') return '7d';
    return undefined;
  }),
};

const mockMailService = {
  sendPasswordResetEmail: jest.fn(),
  sendInviteEmail: jest.fn(),
};

// ─── Suite principal de testes ───────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  // beforeEach roda antes de CADA teste — garante isolamento
  beforeEach(async () => {
    // Criamos um módulo de teste com as dependências mockadas
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Limpa o histórico de chamadas dos mocks entre testes
    jest.clearAllMocks();
  });

  it('deve ser definido (sanity check)', () => {
    expect(service).toBeDefined();
  });

  // ─── login ────────────────────────────────────────────────
  describe('login', () => {
    it('deve retornar usuário e token quando credenciais são válidas', async () => {
      // Arrange: criamos um hash real para a senha
      const hashed = await bcrypt.hash('password123', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: hashed,
      });

      // Act: chamamos o método
      const result = await service.login({
        email: 'user@example.com',
        password: 'password123',
      });

      // Assert: verificamos o resultado
      expect(result.user.email).toBe('user@example.com');
      expect(result.token).toBe('jwt-token');
      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'unknown@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando senha está incorreta', async () => {
      // O usuário existe mas a senha não bate
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.login({ email: 'user@example.com', password: 'senhaErrada' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('deve lançar UnauthorizedException quando conta usa OAuth (sem senha)', async () => {
      // Conta criada via Google/GitHub não tem passwordHash
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: null,
      });

      await expect(
        service.login({ email: 'user@example.com', password: 'qualquer' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── register ─────────────────────────────────────────────
  describe('register', () => {
    it('deve criar usuário e retornar resposta de autenticação', async () => {
      mockUsersService.create.mockResolvedValue(mockUser);

      const result = await service.register({
        name: 'User',
        email: 'user@example.com',
        password: 'password123',
      });

      expect(result.user.email).toBe('user@example.com');
      expect(result.token).toBe('jwt-token');
      expect(mockUsersService.create).toHaveBeenCalled();

      // Verifica que a senha foi hasheada (não enviada em texto puro)
      const createCall = mockUsersService.create.mock.calls[0][0];
      expect(createCall.passwordHash).toBeDefined();
      expect(createCall.passwordHash).not.toBe('password123');
    });

    it('deve lançar ConflictException quando email já está em uso', async () => {
      mockUsersService.create.mockRejectedValue(
        new ConflictException('Este email já está em uso'),
      );

      await expect(
        service.register({
          name: 'User',
          email: 'user@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ─── refresh ──────────────────────────────────────────────
  describe('refresh', () => {
    it('deve retornar usuário e token quando usuário existe', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.refresh({
        sub: 'user-1',
        email: 'user@example.com',
      });

      expect(result.user.id).toBe('user-1');
      expect(result.token).toBe('jwt-token');
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        service.refresh({ sub: 'unknown', email: 'u@x.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── getProfile ───────────────────────────────────────────
  describe('getProfile', () => {
    it('deve retornar o perfil do usuário', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);

      const result = await service.getProfile({ sub: 'user-1', email: 'user@example.com' });

      expect(result.id).toBe('user-1');
      expect(result.name).toBe('User');
      expect(result.email).toBe('user@example.com');
    });

    it('deve lançar UnauthorizedException quando usuário não existe', async () => {
      mockUsersService.findById.mockResolvedValue(null);

      await expect(
        service.getProfile({ sub: 'ghost', email: 'ghost@x.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ─── updateProfile ────────────────────────────────────────
  describe('updateProfile', () => {
    it('deve lançar BadRequestException quando senhas não coincidem', async () => {
      await expect(
        service.updateProfile(
          { sub: 'user-1', email: 'user@example.com' },
          { password: 'nova123', confirmPassword: 'diferente' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando confirmPassword está vazio', async () => {
      await expect(
        service.updateProfile(
          { sub: 'user-1', email: 'user@example.com' },
          { password: 'nova123', confirmPassword: '' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve atualizar perfil com sucesso', async () => {
      mockUsersService.updateProfile.mockResolvedValue({
        ...mockUser,
        name: 'Novo Nome',
      });

      const result = await service.updateProfile(
        { sub: 'user-1', email: 'user@example.com' },
        { name: 'Novo Nome' },
      );

      expect(result.name).toBe('Novo Nome');
      expect(mockUsersService.updateProfile).toHaveBeenCalledWith('user-1', {
        name: 'Novo Nome',
      });
    });

    it('deve hashear a senha ao atualizar', async () => {
      mockUsersService.updateProfile.mockResolvedValue(mockUser);

      await service.updateProfile(
        { sub: 'user-1', email: 'user@example.com' },
        { password: 'novaSenha123', confirmPassword: 'novaSenha123' },
      );

      const updateCall = mockUsersService.updateProfile.mock.calls[0][1];
      expect(updateCall.passwordHash).toBeDefined();
      expect(updateCall.passwordHash).not.toBe('novaSenha123');
    });
  });

  // ─── forgotPassword ───────────────────────────────────────
  describe('forgotPassword', () => {
    it('deve retornar silenciosamente quando email não existe (segurança)', async () => {
      // Por segurança, não revelamos se o email existe ou não
      mockUsersService.findByEmail.mockResolvedValue(null);

      // Não deve lançar erro
      await expect(service.forgotPassword('ghost@x.com')).resolves.toBeUndefined();
      expect(mockMailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('deve gerar token e enviar email quando usuário existe', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockUsersService.updateResetToken.mockResolvedValue(undefined);
      mockMailService.sendPasswordResetEmail.mockResolvedValue(undefined);

      await service.forgotPassword('user@example.com');

      expect(mockUsersService.updateResetToken).toHaveBeenCalledWith(
        'user-1',
        expect.any(String), // token gerado aleatoriamente
        expect.any(Date),   // data de expiração
      );
      expect(mockMailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        'user@example.com',
        expect.any(String),
      );
    });
  });

  // ─── resetPassword ────────────────────────────────────────
  describe('resetPassword', () => {
    it('deve lançar BadRequestException quando token é inválido', async () => {
      mockUsersService.findByResetToken.mockResolvedValue(null);

      await expect(
        service.resetPassword('token-invalido', 'novaSenha'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve lançar BadRequestException quando token está expirado', async () => {
      const expired = new Date();
      expired.setHours(expired.getHours() - 2); // 2 horas atrás

      mockUsersService.findByResetToken.mockResolvedValue({
        ...mockUser,
        resetPasswordExpires: expired,
      });

      await expect(
        service.resetPassword('token-expirado', 'novaSenha'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve redefinir a senha com sucesso', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1);

      mockUsersService.findByResetToken.mockResolvedValue({
        ...mockUser,
        resetPasswordExpires: futureDate,
      });
      mockUsersService.updatePasswordAndClearToken.mockResolvedValue(undefined);

      await service.resetPassword('token-valido', 'novaSenha123');

      expect(mockUsersService.updatePasswordAndClearToken).toHaveBeenCalledWith(
        'user-1',
        expect.any(String), // hash da nova senha
      );
    });
  });

  // ─── validateOAuthUser ────────────────────────────────────
  describe('validateOAuthUser', () => {
    it('deve criar ou encontrar usuário OAuth e retornar token', async () => {
      mockUsersService.findOrCreateByOAuth.mockResolvedValue(mockUser);

      const result = await service.validateOAuthUser('google', {
        id: 'google-123',
        emails: [{ value: 'user@gmail.com' }],
        displayName: 'User Google',
        photos: [{ value: 'https://avatar.url' }],
      });

      expect(result.token).toBe('jwt-token');
      expect(mockUsersService.findOrCreateByOAuth).toHaveBeenCalledWith({
        provider: 'google',
        providerId: 'google-123',
        email: 'user@gmail.com',
        name: 'User Google',
        avatar: 'https://avatar.url',
      });
    });
  });
});
