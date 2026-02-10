import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('comments')
@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) { }

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/') ||
        file.mimetype === 'application/pdf' ||
        file.mimetype === 'application/msword' ||
        file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        cb(null, true);
      } else {
        cb(new BadRequestException('Apenas imagens e documentos (PDF, DOC, DOCX) são permitidos'), false);
      }
    },
  }))
  @ApiOperation({ summary: 'Add a comment to a card' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        content: { type: 'string' },
        cardId: { type: 'string' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  create(
    @CurrentUser() user: any,
    @Body() createCommentDto: CreateCommentDto,
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.commentsService.create(user.sub, createCommentDto, file);
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
