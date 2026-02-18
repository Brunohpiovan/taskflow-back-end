import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export const CARD_DESCRIPTION_MAX_LENGTH = 500;

export class CreateCardDto {
  @ApiProperty({ example: 'Tarefa exemplo' })
  @IsString()
  @MinLength(1, { message: 'Título é obrigatório' })
  @MaxLength(200, { message: 'Título deve ter no máximo 200 caracteres' })
  title: string;

  @ApiPropertyOptional({ maxLength: CARD_DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CARD_DESCRIPTION_MAX_LENGTH, {
    message: `A descrição deve ter no máximo ${CARD_DESCRIPTION_MAX_LENGTH} caracteres`,
  })
  description?: string;

  @ApiProperty()
  @IsString()
  boardId: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'User IDs to assign as members',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  members?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
