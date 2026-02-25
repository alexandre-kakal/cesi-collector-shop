import { ArgumentsHost, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthExceptionFilter } from './auth-exception.filter';

describe('AuthExceptionFilter', () => {
  let filter: AuthExceptionFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    filter = new AuthExceptionFilter();
    mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  });

  const createMockHost = (): ArgumentsHost =>
    ({
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    }) as any;

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle UnauthorizedException', () => {
    const exception = new UnauthorizedException('Invalid credentials');
    filter.catch(exception, createMockHost());

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'UnauthorizedException',
        timestamp: expect.any(String),
      }),
    );
  });

  it('should handle ForbiddenException', () => {
    const exception = new ForbiddenException('Access denied');
    filter.catch(exception, createMockHost());

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Access denied',
        error: 'ForbiddenException',
        timestamp: expect.any(String),
      }),
    );
  });
});
