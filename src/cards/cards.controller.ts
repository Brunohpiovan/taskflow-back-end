import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CardsService } from './cards.service';
import { CreateCardDto } from './dto/create-card.dto';
import { UpdateCardDto } from './dto/update-card.dto';
import { MoveCardDto } from './dto/move-card.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Cards')
@ApiBearerAuth('JWT')
@Controller('cards')
export class CardsController {
  private readonly logger = new Logger(CardsController.name);

  constructor(private readonly cardsService: CardsService) { }

  @Get('calendar')
  @ApiOperation({
    summary: 'Listar cards com data de entrega para o calendário',
  })
  getCalendarCards(
    @Query('environmentId') environmentId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!environmentId) {
      throw new BadRequestException('environmentId é obrigatório');
    }
    return this.cardsService.findAllWithDueDate(environmentId, user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar detalhes completos de um card' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.cardsService.findOne(id, user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Criar card' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCardDto) {
    this.logger.debug(`Creating card: ${JSON.stringify(dto)}`);
    return this.cardsService.create(user.sub, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar card' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateCardDto,
  ) {
    return this.cardsService.update(id, user.sub, dto);
  }

  @Patch(':id/move')
  @ApiOperation({ summary: 'Mover card para outro board/posição' })
  move(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: MoveCardDto,
  ) {
    return this.cardsService.move(id, user.sub, dto);
  }

  // Card Members endpoints
  @Get(':id/members')
  @ApiOperation({ summary: 'Listar membros do card' })
  getMembers(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.cardsService.getCardMembers(id, user.sub);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Adicionar membro ao card' })
  addMember(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: { userId: string },
  ) {
    return this.cardsService.addCardMember(id, dto.userId, user.sub);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover membro do card' })
  removeMember(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cardsService.removeCardMember(id, userId, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir card' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.cardsService.remove(id, user.sub);
  }
}
