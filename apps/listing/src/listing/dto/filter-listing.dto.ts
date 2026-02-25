import { IsEnum, IsOptional, IsNumber, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ListingStatus } from '@app/shared';

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class FilterListingDto {
  @IsEnum(ListingStatus)
  @IsOptional()
  status?: ListingStatus;

  @Matches(UUID_PATTERN, { message: 'categoryId must be a UUID' })
  @IsOptional()
  categoryId?: string;

  /** Filtre par vendeur (utilisé par le front pour "mes annonces") */
  @Matches(UUID_PATTERN, { message: 'sellerId must be a UUID' })
  @IsOptional()
  sellerId?: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;
}
