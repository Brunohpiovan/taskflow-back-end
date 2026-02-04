import { Controller, Get, Delete, Param, UseGuards, Req } from '@nestjs/common';
import { MembersService } from './members.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

interface RequestWithUser {
  user: { id: string };
}

@ApiTags('Members')
@Controller('environments/:id/members')
export class MembersController {
  constructor(private readonly membersService: MembersService) { }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOperation({ summary: 'Listar membros do ambiente' })
  findAll(@Param('id') environmentId: string, @Req() req: RequestWithUser) {
    return this.membersService.findAll(environmentId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete(':memberId')
  @ApiOperation({ summary: 'Remover membro' })
  remove(
    @Param('id') environmentId: string,
    @Param('memberId') memberId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.membersService.remove(environmentId, memberId, req.user.id);
  }
}
