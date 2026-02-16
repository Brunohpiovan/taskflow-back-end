import { IsNotEmpty, IsUUID } from 'class-validator';

export class AddCardMemberDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}

export class CardMemberResponseDto {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  assignedAt: Date;
}
