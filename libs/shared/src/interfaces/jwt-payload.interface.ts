import { Role } from '../enums/role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  jti?: string;
  iat?: number;
  exp?: number;
}
