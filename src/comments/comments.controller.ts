import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, Request } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('comments')
@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
    constructor(private readonly commentsService: CommentsService) { }

    @Post()
    @ApiOperation({ summary: 'Add a comment to a card' })
    create(@CurrentUser() user: any, @Body() createCommentDto: CreateCommentDto) {
        return this.commentsService.create(user.sub, createCommentDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get comments for a card' })
    findAll(@Query('cardId') cardId: string) {
        return this.commentsService.findAllByCard(cardId);
    }

    @Delete(':id')
    remove(@CurrentUser() user: any, @Param('id') id: string) {
        return this.commentsService.remove(id, user.sub);
    }
}
