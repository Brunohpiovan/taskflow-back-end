import {
  IsString,
  IsOptional,
  MinLength,
  MaxLength,
  IsInt,
  Min,
  IsArray,
  IsDateString,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CARD_DESCRIPTION_MAX_LENGTH } from './create-card.dto';

export class UpdateCardDto {
  @ApiPropertyOptional({ example: 'Tarefa exemplo updated' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200, { message: 'Título deve ter no máximo 200 caracteres' })
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

  /**
   * ISO date string for the due date, or empty string "" to clear the due date.
   */
  @ApiPropertyOptional({ description: 'ISO date string or empty string to clear' })
  @IsOptional()
  @ValidateIf((o) => o.dueDate !== '')
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  completed?: boolean;
}
