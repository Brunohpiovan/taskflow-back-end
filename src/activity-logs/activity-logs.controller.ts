import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { ActivityLogsService } from './activity-logs.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Activity Logs')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('activity-logs')
export class ActivityLogsController {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @ApiOperation({ summary: 'Buscar logs de um card' })
  @Get()
  async getByCardId(@Query('cardId') cardId: string) {
    return this.activityLogsService.getByCardId(cardId);
  }
}
