import { Module, forwardRef } from '@nestjs/common';
import { CardsController } from './cards.controller';
import { CardsService } from './cards.service';
import { BoardsModule } from '../boards/boards.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';

@Module({
  imports: [forwardRef(() => BoardsModule), ActivityLogsModule],
  controllers: [CardsController],
  providers: [CardsService],
  exports: [CardsService],
})
export class CardsModule { }
