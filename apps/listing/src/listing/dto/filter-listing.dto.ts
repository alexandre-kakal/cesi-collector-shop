import { IsEnum, IsOptional, IsUUID, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ListingStatus } from '@app/shared';

export class FilterListingDto {
  @IsEnum(ListingStatus)
  @IsOptional()
  status?: ListingStatus;

  @IsUUID()
  @IsOptional()
  categoryId?: string;

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
