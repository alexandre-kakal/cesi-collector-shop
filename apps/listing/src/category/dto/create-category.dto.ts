import { IsString, IsOptional, Matches } from 'class-validator';

const UUID_PATTERN =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class CreateCategoryDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @Matches(UUID_PATTERN, { message: 'parentId must be a UUID' })
  @IsOptional()
  parentId?: string;
}
