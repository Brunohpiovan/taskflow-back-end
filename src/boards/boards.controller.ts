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
import { BoardsService } from './boards.service';
import { CardsService } from '../cards/cards.service';
import { CreateBoardDto } from './dto/create-board.dto';
import { UpdateBoardDto } from './dto/update-board.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Boards')
@ApiBearerAuth('JWT')
@Controller('boards')
export class BoardsController {
  constructor(
    private readonly boardsService: BoardsService,
    private readonly cardsService: CardsService,
  ) {}

  @Get(':boardId/cards')
  @ApiOperation({ summary: 'Listar cards de um board' })
  findCards(
    @Param('boardId') boardId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.cardsService.findByBoardId(boardId, user.sub);
  }

  @Post()
  @ApiOperation({ summary: 'Criar board' })
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateBoardDto,
  ) {
    return this.boardsService.create(user.sub, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar board' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateBoardDto,
  ) {
    return this.boardsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir board' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.boardsService.remove(id, user.sub);
  }
}
