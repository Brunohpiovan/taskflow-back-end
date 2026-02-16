import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';
import { MetricsResponseDto } from './dto/metrics-response.dto';

@ApiTags('Metrics')
@ApiBearerAuth('JWT')
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @ApiOperation({ summary: 'Obter métricas agregadas do usuário' })
  async getMetrics(
    @CurrentUser() user: JwtPayload,
  ): Promise<MetricsResponseDto> {
    try {
      return await this.metricsService.getMetrics(user.sub);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      throw error;
    }
  }
}
