import { IsString, IsOptional, IsNumber, IsPositive, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class CreateListingDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Transform(({ value }) => (value === '' || value == null ? value : Number(value)))
  @IsNumber()
  @IsPositive()
  price: number;

  @Matches(UUID_PATTERN, { message: 'categoryId must be a UUID' })
  categoryId: string;
}
