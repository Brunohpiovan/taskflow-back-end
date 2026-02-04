import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLabelDto {
  @ApiPropertyOptional({ example: 'Bug' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '#ff0000' })
  @IsString()
  @IsOptional()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Color must be a valid hex color code (e.g. #FF0000)',
  })
  color?: string;
}
