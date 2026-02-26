import { CurrentUser, getCurrentUserFromRequest } from './current-user.decorator';
import { RequestUser } from '../interfaces/request-user.interface';
import { Role } from '../enums/role.enum';

describe('CurrentUser decorator', () => {
  it('should be a function', () => {
    expect(typeof CurrentUser()).toBe('function');
  });
});

describe('getCurrentUserFromRequest', () => {
  it('should return full user when no data key', () => {
    const user: RequestUser = { id: 'u1', email: 'u@test.com', role: Role.BUYER };
    expect(getCurrentUserFromRequest(undefined, { user })).toEqual(user);
  });

  it('should return user property when data key provided', () => {
    const user: RequestUser = { id: 'u1', email: 'u@test.com', role: Role.SELLER };
    expect(getCurrentUserFromRequest('id', { user })).toBe('u1');
    expect(getCurrentUserFromRequest('email', { user })).toBe('u@test.com');
    expect(getCurrentUserFromRequest('role', { user })).toBe(Role.SELLER);
  });

  it('should return undefined when user is null and data key provided', () => {
    expect(getCurrentUserFromRequest('id', { user: undefined })).toBeUndefined();
  });

  it('should return undefined when user is null and no data', () => {
    expect(getCurrentUserFromRequest(undefined, { user: undefined })).toBeUndefined();
  });
});
