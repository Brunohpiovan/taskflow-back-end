import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../services/mail.service';
import { InviteStatus, MemberRole } from '@prisma/client';
import { v4 as uuid } from 'uuid';

@Injectable()
export class InvitesService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async create(environmentId: string, email: string, userId: string) {
    // 1. Check if user is OWNER of the environment
    const environment = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      include: { members: true, user: true },
    });

    if (!environment) throw new NotFoundException('Ambiente não encontrado');

    // Check ownership: Legacy userId check OR EnvironmentMember check
    // Since we just migrated, we might check both, but effectively only OWNERS can invite.
    // For now, let's assume if the userId matches environment.userId, they are owner.
    // Also check if they are an OWNER member.
    const isLegacyOwner = environment.userId === userId;
    const isMemberOwner = environment.members.some(
      (m) => m.userId === userId && m.role === MemberRole.OWNER,
    );

    if (!isLegacyOwner && !isMemberOwner) {
      throw new ForbiddenException(
        'Apenas o dono do ambiente pode enviar convites',
      );
    }

    // 2. Check if user to invite exists (optional requirement: "se esse email existir no sistema")
    // User requirement: "se esse email existir no sistema ele envia um convite"
    const userToInvite = await this.prisma.user.findUnique({
      where: { email },
    });
    if (!userToInvite) {
      // Silent fail or explicit? User said: "se esse email existir... ele envia".
      // implies if not exists, maybe nothing happens or we send "sign up" invite?
      // Let's throw error for feedback or return null.
      throw new NotFoundException('Usuário não encontrado com este email');
    }

    // 3. Check if already a member
    const isAlreadyMember = environment.members.some(
      (m) => m.userId === userToInvite.id,
    );
    if (isAlreadyMember) {
      throw new ConflictException('Usuário já é membro deste ambiente');
    }

    // 4. Check/Create Invite
    // Delete pending invites for same email/env to avoid duplicates
    await this.prisma.invite.deleteMany({
      where: {
        environmentId,
        email,
        status: InviteStatus.PENDING,
      },
    });

    const token = uuid();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiration

    await this.prisma.invite.create({
      data: {
        environmentId,
        email,
        token,
        expiresAt,
        status: InviteStatus.PENDING,
      },
      include: { environment: true },
    });

    // 5. Send Email
    const inviter = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    await this.mailService.sendInviteEmail(
      email,
      token,
      environment.name,
      inviter?.name ?? 'Um usuário',
    );

    return { message: 'Convite enviado com sucesso' };
  }

  async accept(token: string, userId: string) {
    const invite = await this.prisma.invite.findUnique({
      where: { token },
      include: { environment: true },
    });

    if (!invite) throw new NotFoundException('Convite inválido');
    if (invite.status !== InviteStatus.PENDING)
      throw new BadRequestException('Convite já utilizado ou expirado');
    if (new Date() > invite.expiresAt)
      throw new BadRequestException('Convite expirado');

    // Check if user email matches invite email?
    // User said: "envia um convite para o email do usuario".
    // It is safer to verify the logged-in user matches the invited email.
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email !== invite.email) {
      throw new ForbiddenException('Este convite não pertence a sua conta');
    }

    // Add to members
    // Use transaction to ensure invite status update and member creation happen together
    await this.prisma.$transaction(async (tx) => {
      // Create member
      // Use upsert just in case race condition
      await tx.environmentMember.create({
        data: {
          environmentId: invite.environmentId,
          userId: userId,
          role: MemberRole.MEMBER,
        },
      });

      // Update invite
      await tx.invite.update({
        where: { id: invite.id },
        data: { status: InviteStatus.ACCEPTED },
      });
    });

    return {
      message: 'Convite aceito com sucesso',
      environmentSlug: invite.environment.slug,
    };
  }
}
