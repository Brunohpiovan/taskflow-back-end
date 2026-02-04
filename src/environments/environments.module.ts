import { Module } from '@nestjs/common';
import { EnvironmentsController } from './environments.controller';
import { EnvironmentsService } from './environments.service';
import { BoardsModule } from '../boards/boards.module';
import { MembersController } from './members.controller';
import { InvitesController } from './invites.controller';
import { MembersService } from './members.service';
import { InvitesService } from './invites.service';
import { MailService } from '../services/mail.service';

@Module({
  imports: [BoardsModule],
  controllers: [EnvironmentsController, MembersController, InvitesController],
  providers: [EnvironmentsService, MembersService, InvitesService, MailService],
  exports: [EnvironmentsService],
})
export class EnvironmentsModule {}
