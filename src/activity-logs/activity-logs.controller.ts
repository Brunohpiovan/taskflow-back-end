import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Activity Logs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) { }

  @ApiOperation({ summary: 'Buscar logs de atividade de um card (paginado)' })
  @ApiQuery({ name: 'cardId', required: true, description: 'ID do card' })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'ID do último item recebido (para próxima página)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Itens por página (padrão: 10, máximo: 50)',
    type: Number,
  })
  @Get()
  async getByCardId(
    @Query('cardId') cardId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    return this.activityLogsService.getByCardId(
      cardId,
      cursor,
      limit ? Number(limit) : 10,
    );
  }
}
