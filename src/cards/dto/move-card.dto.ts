import { IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class MoveCardDto {
  @ApiProperty()
  @IsString()
  targetBoardId: string;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  newPosition: number;
}
