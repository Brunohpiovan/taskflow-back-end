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
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CARD_DESCRIPTION_MAX_LENGTH } from './create-card.dto';

export class UpdateCardDto {
  @ApiPropertyOptional({ example: 'Tarefa exemplo updated' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  title?: string;

  @ApiPropertyOptional({ maxLength: CARD_DESCRIPTION_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CARD_DESCRIPTION_MAX_LENGTH)
  description?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
