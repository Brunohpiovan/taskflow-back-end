import { IsString, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
    @ApiProperty({ example: 'This is a comment' })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiProperty()
    @IsUUID()
    cardId: string;
}
