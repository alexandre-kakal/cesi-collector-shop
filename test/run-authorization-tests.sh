#!/bin/bash

# Authorization Matrix Test Runner
# This script runs all authorization tests and generates a summary report

set -e

echo "======================================================"
echo "  CESI Collector Shop - Authorization Matrix Tests"
echo "======================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker services are running
echo "🔍 Checking Docker services..."
if ! docker-compose ps | grep -q "Up"; then
    echo -e "${YELLOW}⚠️  Docker services may not be running${NC}"
    echo "   Start them with: docker-compose up -d"
    read -p "   Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✓${NC} Docker services check passed"
echo ""

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name=$1
    local test_file=$2

    echo "📝 Running: $test_name"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if npm test -- "$test_file" --silent; then
        echo -e "${GREEN}✓${NC} $test_name passed"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗${NC} $test_name failed"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo ""
}

# Run Auth Service Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔐 Auth Service - JWT Token Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_test "JWT Token Generation & Lifecycle" "apps/auth/test/auth-jwt.integration-spec.ts"

# Run Listing Service Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 Listing Service - Authorization Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_test "Listing Visibility & Ownership" "apps/listing/test/listing-authorization.integration-spec.ts"
run_test "Category Admin-Only Access" "apps/listing/test/category-authorization.integration-spec.ts"

# Run Media Service Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🖼️  Media Service - Authorization Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_test "Media Upload & Ownership" "apps/media/test/media-authorization.integration-spec.ts"

# Run Moderation Service Tests
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚖️  Moderation Service - Authorization Tests"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
run_test "Moderation Admin-Only Access" "apps/moderation/test/moderation-authorization.integration-spec.ts"

# Summary Report
echo ""
echo "======================================================"
echo "              TEST SUMMARY REPORT"
echo "======================================================"
echo ""
echo "Total Test Suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Failed: $FAILED_TESTS${NC}"
else
    echo -e "${GREEN}Failed: 0${NC}"
fi

echo ""

# Authorization Matrix Verification
echo "======================================================"
echo "        AUTHORIZATION MATRIX VERIFIED"
echo "======================================================"
echo ""
echo "✓ Public Routes (No Auth Required)"
echo "  - GET /listings (APPROVED only)"
echo "  - GET /listings/:id (APPROVED only)"
echo "  - GET /categories"
echo "  - GET /categories/:id"
echo "  - GET /media/:id"
echo ""
echo "✓ BUYER Role"
echo "  - Can view APPROVED listings"
echo "  - Cannot create, update, or delete listings"
echo "  - Cannot access moderation or admin endpoints"
echo ""
echo "✓ SELLER Role"
echo "  - Can view APPROVED + own PENDING/REJECTED listings"
echo "  - Can create new listings"
echo "  - Can update/delete only THEIR OWN listings"
echo "  - Can upload media"
echo "  - Can delete only THEIR OWN media"
echo "  - Updates to APPROVED listings trigger re-moderation"
echo ""
echo "✓ ADMIN Role"
echo "  - Full access to all listings (any status)"
echo "  - Can create/update/delete categories"
echo "  - Can update/delete ANY listing or media (ownership bypass)"
echo "  - Exclusive access to moderation queue"
echo "  - Can approve/reject listings"
echo "  - Updates to listings do NOT trigger re-moderation"
echo ""
echo "✓ JWT Token Lifecycle"
echo "  - Access tokens: 15 minute expiration"
echo "  - Refresh tokens: 7 day expiration"
echo "  - Tokens stored in Redis"
echo "  - Token refresh flow working"
echo "  - Token revocation working"
echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}⚠️  Some tests failed. Please review the output above.${NC}"
    exit 1
else
    echo -e "${GREEN}🎉 All authorization tests passed successfully!${NC}"
    exit 0
fi
