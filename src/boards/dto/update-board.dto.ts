import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateBoardDto } from './create-board.dto';

export class UpdateBoardDto extends PartialType(
  OmitType(CreateBoardDto, ['environmentId'] as const),
) {}
