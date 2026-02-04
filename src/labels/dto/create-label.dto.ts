import { IsString, IsNotEmpty, IsHexColor, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateLabelDto {
  @ApiProperty({ example: 'Bug' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '#ff0000', description: 'Hex color code' })
  @IsString()
  @IsNotEmpty()
  // @IsHexColor() // Strict hex color check
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Color must be a valid hex color code (e.g. #FF0000)',
  })
  color: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  environmentId: string;
}
