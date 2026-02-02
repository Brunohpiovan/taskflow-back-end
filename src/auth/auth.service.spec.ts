import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { User } from '@prisma/client';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  const mockUser: User = {
    id: 'user-1',
    email: 'user@example.com',
    passwordHash: 'hashed',
    name: 'User',
    avatar: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
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

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should return user and token when credentials are valid', async () => {
      const hashed = await bcrypt.hash('password123', 10);
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        passwordHash: hashed,
      });
      const result = await service.login({
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.user.email).toBe('user@example.com');
      expect(result.token).toBe('jwt-token');
      expect(usersService.findByEmail).toHaveBeenCalledWith('user@example.com');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      await expect(
        service.login({ email: 'unknown@example.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password is invalid', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      await expect(
        service.login({
          email: 'user@example.com',
          password: 'wrongpassword',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('register', () => {
    it('should create user and return auth response', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      const result = await service.register({
        name: 'User',
        email: 'user@example.com',
        password: 'password123',
      });
      expect(result.user.email).toBe('user@example.com');
      expect(result.token).toBe('jwt-token');
      expect(usersService.create).toHaveBeenCalled();
      const createCall = mockUsersService.create.mock.calls[0][0];
      expect(createCall.email).toBe('user@example.com');
      expect(createCall.name).toBe('User');
      expect(createCall.passwordHash).toBeDefined();
    });

    it('should throw ConflictException when email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
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

  describe('refresh', () => {
    it('should return user and token when user exists', async () => {
      mockUsersService.findById.mockResolvedValue(mockUser);
      const result = await service.refresh({
        sub: 'user-1',
        email: 'user@example.com',
      });
      expect(result.user.id).toBe('user-1');
      expect(result.token).toBe('jwt-token');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findById.mockResolvedValue(null);
      await expect(
        service.refresh({ sub: 'unknown', email: 'u@x.com' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
