import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberRole } from '@prisma/client';

@Injectable()
export class MembersService {
  constructor(private prisma: PrismaService) {}

  async findAll(environmentId: string, userId: string) {
    // Verify access
    const member = await this.prisma.environmentMember.findUnique({
      where: {
        environmentId_userId: { environmentId, userId },
      },
    });

    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
    });
    const isLegacyOwner = environment?.userId === userId;

    if (!member && !isLegacyOwner) {
      throw new ForbiddenException('Acesso negado');
    }

    // List members
    const members = await this.prisma.environmentMember.findMany({
      where: { environmentId },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return members.map((m) => ({
      id: m.id,
      userId: m.userId,
      name: m.user.name,
      email: m.user.email, // Should we expose email? Assuming yes for internal team.
      avatar: m.user.avatar,
      role: m.role,
      joinedAt: m.joinedAt,
    }));
  }

  async remove(environmentId: string, memberId: string, userId: string) {
    // 1. Verify requester is OWNER
    const requester = await this.prisma.environmentMember.findUnique({
      where: { environmentId_userId: { environmentId, userId } },
    });
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
    });
    const isLegacyOwner = environment?.userId === userId;

    const isRequesterOwner =
      isLegacyOwner || (requester && requester.role === MemberRole.OWNER);

    if (!isRequesterOwner) {
      throw new ForbiddenException(
        'Apenas o dono do ambiente pode remover membros',
      );
    }

    // 2. Find member to remove
    const memberToRemove = await this.prisma.environmentMember.findUnique({
      where: { id: memberId },
    });

    if (!memberToRemove) throw new NotFoundException('Membro não encontrado');
    if (memberToRemove.environmentId !== environmentId)
      throw new ForbiddenException('Membro não pertence a este ambiente');

    // Prevent removing self if there is no other owner?
    // Or allow removing self as "Leave Environment"?
    // Logic here is "Remove Member" (kick).
    if (memberToRemove.userId === userId) {
      throw new ForbiddenException('Você não pode se remover por esta rota');
    }

    await this.prisma.environmentMember.delete({
      where: { id: memberId },
    });
  }
}
