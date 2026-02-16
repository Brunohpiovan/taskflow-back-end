import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EnvironmentsService } from './environments.service';
import { BoardsService } from '../boards/boards.service';
import { CreateEnvironmentDto } from './dto/create-environment.dto';
import { UpdateEnvironmentDto } from './dto/update-environment.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Environments')
@ApiBearerAuth('JWT')
@Controller('environments')
export class EnvironmentsController {
  constructor(
    private readonly environmentsService: EnvironmentsService,
    private readonly boardsService: BoardsService,
  ) { }

  @Get('dashboard')
  @ApiOperation({
    summary: 'Listar ambientes para dashboard (dados otimizados)',
  })
  findAllDashboard(@CurrentUser() user: JwtPayload) {
    try {
      return this.environmentsService.findAllDashboard(user.sub);
    } catch (error) {
      console.error('Error fetching dashboard environments:', error);
      throw error;
    }
  }

  @Get('simple')
  @ApiOperation({
    summary: 'Listar ambientes simplificado (apenas id, nome e slug)',
  })
  findAllSimple(@CurrentUser() user: JwtPayload) {
    try {
      return this.environmentsService.findAllSimple(user.sub);
    } catch (error) {
      console.error('Error fetching simple environments:', error);
      throw error;
    }
  }

  @Get()
  @ApiOperation({ summary: 'Listar ambientes do usuário' })
  findAll(@CurrentUser() user: JwtPayload) {
    return this.environmentsService.findAll(user.sub);
  }

  @Get(':id/boards')
  @ApiOperation({ summary: 'Listar boards de um ambiente' })
  findBoards(
    @Param('id') environmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.boardsService.findByEnvironmentId(environmentId, user.sub);
  }

  @Get('slug/:slug')
  @ApiOperation({ summary: 'Obter ambiente pelo slug' })
  findBySlug(@Param('slug') slug: string, @CurrentUser() user: JwtPayload) {
    return this.environmentsService.findBySlug(slug, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar ambiente por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.environmentsService.findOne(id, user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Criar ambiente' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateEnvironmentDto) {
    return this.environmentsService.create(user.sub, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar ambiente' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateEnvironmentDto,
  ) {
    return this.environmentsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir ambiente' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.environmentsService.remove(id, user.sub);
  }
}
