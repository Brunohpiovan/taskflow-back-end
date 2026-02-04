import { IsEnum, IsNotEmpty } from 'class-validator';
import { MemberRole } from '@prisma/client';

export class UpdateMemberRoleDto {
  @IsEnum(MemberRole, { message: 'Cargo inválido' })
  @IsNotEmpty()
  role: MemberRole;
}
