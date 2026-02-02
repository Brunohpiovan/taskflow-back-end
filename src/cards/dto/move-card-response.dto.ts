import { ApiProperty } from '@nestjs/swagger';

export class MoveCardResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  boardId: string;

  @ApiProperty()
  position: number;
}
