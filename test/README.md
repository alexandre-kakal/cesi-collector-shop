# Authorization Matrix Tests

This directory contains integration tests that verify the complete authorization matrix for the Cesi Collector Shop application.

## Test Structure

```
test/
├── helpers/
│   ├── auth.helper.ts          # JWT token generation helpers
│   └── test-data.helper.ts     # Test data factories
├── README.md                    # This file
└── Authorization Matrix Tests per service:
    ├── apps/auth/test/auth-jwt.integration-spec.ts
    ├── apps/listing/test/listing-authorization.integration-spec.ts
    ├── apps/listing/test/category-authorization.integration-spec.ts
    ├── apps/media/test/media-authorization.integration-spec.ts
    └── apps/moderation/test/moderation-authorization.integration-spec.ts
```

## Authorization Matrix Verified

### Listing Service
| Endpoint | Public | BUYER | SELLER | ADMIN |
|----------|--------|-------|--------|-------|
| GET /listings | ✅ (APPROVED) | ✅ (APPROVED) | ✅ (APPROVED + own PENDING) | ✅ (ALL) |
| GET /listings/:id | ✅ (APPROVED) | ✅ (APPROVED) | ✅ (APPROVED + own) | ✅ (ALL) |
| POST /listings | ❌ | ❌ | ✅ | ✅ |
| PATCH /listings/:id | ❌ | ❌ | ✅ (owner) | ✅ |
| DELETE /listings/:id | ❌ | ❌ | ✅ (owner) | ✅ |

### Category Service
| Endpoint | Public | BUYER | SELLER | ADMIN |
|----------|--------|-------|--------|-------|
| GET /categories | ✅ | ✅ | ✅ | ✅ |
| GET /categories/:id | ✅ | ✅ | ✅ | ✅ |
| POST /categories | ❌ | ❌ | ❌ | ✅ |
| PATCH /categories/:id | ❌ | ❌ | ❌ | ✅ |
| DELETE /categories/:id | ❌ | ❌ | ❌ | ✅ |

### Media Service
| Endpoint | Public | BUYER | SELLER | ADMIN |
|----------|--------|-------|--------|-------|
| GET /media/:id | ✅ | ✅ | ✅ | ✅ |
| POST /media/upload | ❌ | ❌ | ✅ | ✅ |
| DELETE /media/:id | ❌ | ❌ | ✅ (owner) | ✅ |

### Moderation Service
| Endpoint | Public | BUYER | SELLER | ADMIN |
|----------|--------|-------|--------|-------|
| GET /moderation/queue | ❌ | ❌ | ❌ | ✅ |
| GET /moderation/logs | ❌ | ❌ | ❌ | ✅ |
| POST /moderation/:id/approve | ❌ | ❌ | ❌ | ✅ |
| POST /moderation/:id/reject | ❌ | ❌ | ❌ | ✅ |

### Auth Service
- JWT token generation
- Access token (15m expiration)
- Refresh token (7d expiration)
- Token refresh flow
- Token revocation

## Prerequisites

1. **Docker services running:**
   ```bash
   docker-compose up -d
   ```

2. **Environment files configured:**
   - `.env.test` files for each service (auth, listing, moderation, media)
   - RSA key pair for JWT (can use test keys for development)

3. **Database migrations applied:**
   ```bash
   npm run prisma:migrate:auth
   npm run prisma:migrate:listing
   npm run prisma:migrate:moderation
   npm run prisma:migrate:media
   ```

## Running Tests

### Run All Authorization Tests
```bash
npm run test:integration
```

### Run Tests for Specific Service
```bash
# Auth service JWT tests
npm test apps/auth/test/auth-jwt.integration-spec.ts

# Listing authorization tests
npm test apps/listing/test/listing-authorization.integration-spec.ts

# Category authorization tests
npm test apps/listing/test/category-authorization.integration-spec.ts

# Media authorization tests
npm test apps/media/test/media-authorization.integration-spec.ts

# Moderation authorization tests
npm test apps/moderation/test/moderation-authorization.integration-spec.ts
```

### Run Tests with Coverage
```bash
npm run test:cov
```

### Watch Mode (for development)
```bash
npm run test:watch
```

## Test Users

The tests use predefined test users with different roles:

```typescript
TEST_USERS = {
  BUYER: {
    id: 'buyer-test-id',
    email: 'buyer@test.com',
    role: Role.BUYER,
  },
  SELLER: {
    id: 'seller-test-id',
    email: 'seller@test.com',
    role: Role.SELLER,
  },
  SELLER_2: {
    id: 'seller-2-test-id',
    email: 'seller2@test.com',
    role: Role.SELLER,
  },
  ADMIN: {
    id: 'admin-test-id',
    email: 'admin@test.com',
    role: Role.ADMIN,
  },
}
```

## Test Coverage

The tests verify:

### 1. **Authentication & Authorization**
- ✅ Unauthenticated access (401 errors)
- ✅ Invalid tokens (401 errors)
- ✅ Role-based access control (403 errors)
- ✅ Public routes accessibility

### 2. **Ownership Checks**
- ✅ Sellers can only modify their own resources
- ✅ Sellers cannot modify other sellers' resources
- ✅ Admin can modify any resource

### 3. **Visibility Rules**
- ✅ Public users see only APPROVED listings
- ✅ Buyers see only APPROVED listings
- ✅ Sellers see APPROVED + their own PENDING/REJECTED listings
- ✅ Admins see all listings regardless of status

### 4. **Re-moderation Logic**
- ✅ Seller updating APPROVED listing → status changes to PENDING
- ✅ Admin updating APPROVED listing → status remains APPROVED
- ✅ Event is emitted for re-moderation queue

### 5. **JWT Token Lifecycle**
- ✅ Token generation with correct payload
- ✅ Token storage in Redis
- ✅ Token refresh flow
- ✅ Token revocation
- ✅ Token expiration times

### 6. **Error Handling**
- ✅ Clear error messages for unauthorized access
- ✅ Clear error messages for missing authentication
- ✅ Proper status codes (401, 403, 404)

### 7. **Edge Cases**
- ✅ Concurrent operations
- ✅ Non-existent resources
- ✅ Invalid input data
- ✅ Multiple users operating simultaneously

## Test Data Cleanup

Tests automatically clean up their test data in `afterEach` or `afterAll` hooks:
- Database records created during tests are deleted
- MinIO files uploaded during tests are removed
- Redis keys are cleared

## Debugging Tests

### Enable Verbose Logging
```bash
npm test -- --verbose
```

### Run Specific Test Case
```bash
npm test -- -t "should allow SELLER to update their own listing"
```

### Debug in VS Code
Add this configuration to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Jest Debug",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": [
    "--runInBand",
    "--no-cache",
    "${file}"
  ],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen"
}
```

## Common Issues

### 1. Database Connection Errors
**Solution:** Ensure PostgreSQL containers are running:
```bash
docker-compose ps
docker-compose logs postgres-auth
```

### 2. Redis Connection Errors
**Solution:** Ensure Redis container is running:
```bash
docker-compose logs redis
```

### 3. MinIO Connection Errors
**Solution:** Ensure MinIO container is running:
```bash
docker-compose logs minio
```

### 4. Token Verification Errors
**Solution:** Ensure JWT keys are configured in `.env.test` files:
```bash
# Generate test keys
openssl genrsa -out test-private.key 2048
openssl rsa -in test-private.key -pubout -out test-public.key
```

### 5. Port Conflicts
**Solution:** Ensure services are using test ports (different from development):
```
AUTH_PORT=3011 (dev: 3010)
LISTING_PORT=3021 (dev: 3020)
MODERATION_PORT=3031 (dev: 3030)
MEDIA_PORT=3051 (dev: 3050)
```

## CI/CD Integration

These tests are designed to run in CI/CD pipelines:

```bash
# GitHub Actions / GitLab CI
npm run test:setup  # Sets up test databases
npm run test:ci     # Runs all tests with coverage
```

## Contributing

When adding new endpoints or modifying authorization logic:

1. **Add tests** for the new authorization rules
2. **Update this README** if the authorization matrix changes
3. **Run full test suite** before committing:
   ```bash
   npm run test:all
   ```
4. **Ensure coverage** remains above 80%

## Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Authorization Plan](../docs/jwt-authorization-plan.md)
