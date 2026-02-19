import { IsString, IsNotEmpty } from 'class-validator';

export class RejectListingDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}
