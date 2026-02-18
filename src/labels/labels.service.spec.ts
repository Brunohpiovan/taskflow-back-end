/**
 * ============================================================
 * TESTES UNITÁRIOS — LabelsService
 * ============================================================
 *
 * O LabelsService é simples: gerencia labels (etiquetas) de
 * um ambiente. Depende apenas do PrismaService.
 *
 * Regras testadas:
 *   - Não pode criar label em ambiente inexistente
 *   - Operações em label inexistente lançam NotFoundException
 * ============================================================
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { LabelsService } from './labels.service';
import { PrismaService } from '../prisma/prisma.service';

// ─── Dados de exemplo ────────────────────────────────────────
const mockLabel = {
  id: 'label-1',
  name: 'Bug',
  color: '#FF0000',
  environmentId: 'env-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ─── Mock do PrismaService ───────────────────────────────────
const mockPrisma = {
  environment: {
    findUnique: jest.fn(),
  },
  label: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// ─── Suite de testes ─────────────────────────────────────────
describe('LabelsService', () => {
  let service: LabelsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabelsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<LabelsService>(LabelsService);
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
        service.create({ name: 'Bug', color: '#FF0000', environmentId: 'env-inexistente' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('deve criar label com sucesso', async () => {
      mockPrisma.environment.findUnique.mockResolvedValue({ id: 'env-1' });
      mockPrisma.label.create.mockResolvedValue(mockLabel);

      const result = await service.create({
        name: 'Bug',
        color: '#FF0000',
        environmentId: 'env-1',
      });

      expect(result.name).toBe('Bug');
      expect(result.color).toBe('#FF0000');
      expect(mockPrisma.label.create).toHaveBeenCalledWith({
        data: { name: 'Bug', color: '#FF0000', environmentId: 'env-1' },
      });
    });
  });

  // ─── findAllByEnvironment ─────────────────────────────────
  describe('findAllByEnvironment', () => {
    it('deve retornar todas as labels do ambiente', async () => {
      mockPrisma.label.findMany.mockResolvedValue([mockLabel]);

      const result = await service.findAllByEnvironment('env-1');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bug');
      expect(mockPrisma.label.findMany).toHaveBeenCalledWith({
        where: { environmentId: 'env-1' },
      });
    });

    it('deve retornar lista vazia quando não há labels', async () => {
      mockPrisma.label.findMany.mockResolvedValue([]);

      const result = await service.findAllByEnvironment('env-sem-labels');

      expect(result).toHaveLength(0);
    });
  });

  // ─── findOne ──────────────────────────────────────────────
  describe('findOne', () => {
    it('deve retornar a label quando encontrada', async () => {
      mockPrisma.label.findUnique.mockResolvedValue(mockLabel);

      const result = await service.findOne('label-1');

      expect(result.id).toBe('label-1');
      expect(result.name).toBe('Bug');
    });

    it('deve lançar NotFoundException quando label não existe', async () => {
      mockPrisma.label.findUnique.mockResolvedValue(null);

      await expect(service.findOne('label-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── update ───────────────────────────────────────────────
  describe('update', () => {
    it('deve atualizar label com sucesso', async () => {
      mockPrisma.label.findUnique.mockResolvedValue(mockLabel);
      mockPrisma.label.update.mockResolvedValue({ ...mockLabel, name: 'Feature' });

      const result = await service.update('label-1', { name: 'Feature' });

      expect(result.name).toBe('Feature');
    });

    it('deve lançar NotFoundException quando label não existe', async () => {
      mockPrisma.label.findUnique.mockResolvedValue(null);

      await expect(
        service.update('label-inexistente', { name: 'Feature' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ───────────────────────────────────────────────
  describe('remove', () => {
    it('deve deletar label com sucesso', async () => {
      mockPrisma.label.findUnique.mockResolvedValue(mockLabel);
      mockPrisma.label.delete.mockResolvedValue(mockLabel);

      await service.remove('label-1');

      expect(mockPrisma.label.delete).toHaveBeenCalledWith({
        where: { id: 'label-1' },
      });
    });

    it('deve lançar NotFoundException quando label não existe', async () => {
      mockPrisma.label.findUnique.mockResolvedValue(null);

      await expect(service.remove('label-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
