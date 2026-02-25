import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('check should return status ok and timestamp', () => {
    const before = new Date().toISOString();
    const result = controller.check();
    const after = new Date().toISOString();

    expect(result).toEqual({
      status: 'ok',
      timestamp: expect.any(String),
    });
    expect(result.timestamp >= before && result.timestamp <= after).toBe(true);
  });
});
