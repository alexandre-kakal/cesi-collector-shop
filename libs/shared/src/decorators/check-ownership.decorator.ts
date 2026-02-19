import { SetMetadata } from '@nestjs/common';

export const OWNERSHIP_KEY = 'ownership';
export const CheckOwnership = (resourceType: string) =>
  SetMetadata(OWNERSHIP_KEY, resourceType);
