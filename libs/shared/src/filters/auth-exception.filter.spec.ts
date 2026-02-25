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

  it('should handle exception with string getResponse', () => {
    const exception = Object.create(UnauthorizedException.prototype);
    exception.getStatus = () => 401;
    exception.getResponse = () => 'Direct string message';
    exception.message = 'fallback';
    exception.name = 'UnauthorizedException';

    filter.catch(exception as any, createMockHost());

    expect(mockResponse.status).toHaveBeenCalledWith(401);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 401,
        message: 'Direct string message',
        error: 'UnauthorizedException',
      }),
    );
  });

  it('should use exception.message when response object has no message', () => {
    const exception = Object.create(ForbiddenException.prototype);
    exception.getStatus = () => 403;
    exception.getResponse = () => ({ statusCode: 403 });
    exception.message = 'Forbidden by default';
    exception.name = 'ForbiddenException';

    filter.catch(exception as any, createMockHost());

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Forbidden by default',
      }),
    );
  });
});
