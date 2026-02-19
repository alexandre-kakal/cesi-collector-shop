import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

const mockSet = jest.fn();
const mockSetex = jest.fn();
const mockGet = jest.fn();
const mockDel = jest.fn();
const mockExists = jest.fn();
const mockQuit = jest.fn();
const mockOn = jest.fn();

jest.mock('ioredis', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    set: mockSet,
    setex: mockSetex,
    get: mockGet,
    del: mockDel,
    exists: mockExists,
    quit: mockQuit,
    on: mockOn,
  })),
}));

describe('RedisService (unit)', () => {
  let service: RedisService;
  const mockConfig = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const map: Record<string, any> = {
        REDIS_HOST: 'localhost',
        REDIS_PORT: 6379,
        REDIS_PASSWORD: undefined,
      };
      return map[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockSet.mockResolvedValue('OK');
    mockSetex.mockResolvedValue('OK');
    mockGet.mockResolvedValue(null);
    mockDel.mockResolvedValue(1);
    mockExists.mockResolvedValue(0);
    mockQuit.mockResolvedValue('OK');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<RedisService>(RedisService);
    service.onModuleInit();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getClient', () => {
    it('should return the redis client', () => {
      const client = service.getClient();
      expect(client).toBeDefined();
      expect(client.set).toBe(mockSet);
      expect(client.get).toBe(mockGet);
    });
  });

  describe('set', () => {
    it('should call set when no ttl', async () => {
      await service.set('key1', 'value1');

      expect(mockSet).toHaveBeenCalledWith('key1', 'value1');
      expect(mockSetex).not.toHaveBeenCalled();
    });

    it('should call setex when ttl is provided', async () => {
      await service.set('key2', 'value2', 3600);

      expect(mockSetex).toHaveBeenCalledWith('key2', 3600, 'value2');
      expect(mockSet).not.toHaveBeenCalled();
    });
  });

  describe('get', () => {
    it('should return value from redis', async () => {
      mockGet.mockResolvedValueOnce('stored');

      const result = await service.get('key');

      expect(mockGet).toHaveBeenCalledWith('key');
      expect(result).toBe('stored');
    });

    it('should return null when key does not exist', async () => {
      mockGet.mockResolvedValueOnce(null);

      const result = await service.get('missing');

      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      await service.del('key');

      expect(mockDel).toHaveBeenCalledWith('key');
    });
  });

  describe('exists', () => {
    it('should return true when key exists', async () => {
      mockExists.mockResolvedValueOnce(1);

      const result = await service.exists('key');

      expect(mockExists).toHaveBeenCalledWith('key');
      expect(result).toBe(true);
    });

    it('should return false when key does not exist', async () => {
      mockExists.mockResolvedValueOnce(0);

      const result = await service.exists('key');

      expect(result).toBe(false);
    });
  });

  describe('onModuleDestroy', () => {
    it('should call quit on client', async () => {
      await service.onModuleDestroy();

      expect(mockQuit).toHaveBeenCalled();
    });
  });
});
