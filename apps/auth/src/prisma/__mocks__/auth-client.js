/** Mock for auth Prisma client (used in prisma.service.spec) */
const $connect = jest.fn().mockResolvedValue(undefined);
const $disconnect = jest.fn().mockResolvedValue(undefined);

class MockPrismaClient {
  $connect = $connect;
  $disconnect = $disconnect;
}

module.exports = { PrismaClient: MockPrismaClient };
