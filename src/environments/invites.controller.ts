import { Controller, Post, Body, Param, UseGuards, Req } from '@nestjs/common';
import { InvitesService } from './invites.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('Invites')
@Controller()
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('environments/:id/invites')
  @ApiOperation({ summary: 'Convidar usuário para ambiente' })
  create(
    @Param('id') environmentId: string,
    @Body() dto: CreateInviteDto,
    @Req() req: RequestWithUser,
  ) {
    return this.invitesService.create(environmentId, dto.email, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('invites/accept')
  @ApiOperation({ summary: 'Aceitar convite' })
  accept(@Body('token') token: string, @Req() req: RequestWithUser) {
    // Note: If endpoint is public (no JWT), req.user is undefined unless we rely on middleware decoding it separately?
    // Accept invite usually requires user to be logged in IF we want to link it to them.
    // However, the token validation checks email.
    // If we want to verify the CURRENT user matches the invited email, we need Auth.
    // If the endpoint is open, how do we know who is accepting?
    // The previous implementation used `req.user.id`. So we must be Authenticated.
    // I should add @UseGuards(JwtAuthGuard) to this endpoint too if it's missing, OR `req.user` will fail.
    // Let's assume user is logged in.
    // Safe access now
    return this.invitesService.accept(token, req.user.id);
  }
}
