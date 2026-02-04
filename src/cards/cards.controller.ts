import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
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
  constructor(private readonly cardsService: CardsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Buscar detalhes completos de um card' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.cardsService.findOne(id, user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Criar card' })
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateCardDto) {
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

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir card' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.cardsService.remove(id, user.sub);
  }
}
