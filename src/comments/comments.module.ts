import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadService } from '../common/services/upload.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [CommentsController],
  providers: [CommentsService, UploadService],
  exports: [CommentsService],
})
export class CommentsModule { }
