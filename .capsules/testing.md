---json
{
  "name": "testing",
  "description": "Automated tests, fixtures, mocks, and quality gates.",
  "sources": [
    "tests/**",
    "test/**",
    "__tests__/**",
    "e2e/**",
    "spec/**"
  ],
  "fingerprints": {
    "tests/capsule-format.test.ts": "sha256:84ede704e86d07eec68a71b85ad4e4e34c58c2b74eaa9103601ac6e3937ac54a",
    "tests/cli.test.ts": "sha256:c8dd55deb032eee616ad0ef783c4f41d83b315f1abca2b2c1f5ef68e813fb1fc",
    "tests/estimate.test.ts": "sha256:8dc82add962aecb6d330d5477134cfe123e4d9022c614cf6af12b2615fa7f2ff",
    "tests/fingerprint.test.ts": "sha256:ac224581259212e5cf77f2875114bcb86c87747462d01e9f432428c2409171da",
    "tests/fixtures/sample-repo/README.md": "sha256:504c93c0602db99e83b1f46edb699375a33b3018c0a4f8b7c707a3a470539b31",
    "tests/fixtures/sample-repo/package.json": "sha256:7986fa041d16364e68e728db6451e78eea21d96a251235a7876cc0ee032aad00",
    "tests/fixtures/sample-repo/src/api/users.ts": "sha256:87a34b537e20aea9f2f907145b6cde73f93211a3fb3d3e74ff6045bef0a91366",
    "tests/fixtures/sample-repo/src/components/button.tsx": "sha256:1dc7a2111f31e37e693b6b6befa5c7141411471168e20a2fc93c886382dfb862",
    "tests/fixtures/sample-repo/src/db/schema.ts": "sha256:bce205a16dd5a1f7fe753d015d4b6b74a54ff457b67ac16da67adafd5422845c",
    "tests/fixtures/sample-repo/tests/users.test.ts": "sha256:714024ded73b57beac0ca95dc36011c3e86823027c16845c467ba5d9fb789a96",
    "tests/repo-scan.test.ts": "sha256:868d618459a31cb3c1e27609f3902b28897e4e64f4b589a71926851049f1fe68"
  },
  "updated_at": "2026-06-20T13:53:21.659Z"
}
---
# Testing Capsule

## Purpose

Automated tests, fixtures, mocks, and quality gates.

## Key Files

- `tests/capsule-format.test.ts`: source file matched by this capsule.
- `tests/cli.test.ts`: source file matched by this capsule.
- `tests/estimate.test.ts`: source file matched by this capsule.
- `tests/fingerprint.test.ts`: source file matched by this capsule.
- `tests/fixtures/sample-repo/README.md`: source file matched by this capsule.
- `tests/fixtures/sample-repo/package.json`: source file matched by this capsule.
- `tests/fixtures/sample-repo/src/api/users.ts`: source file matched by this capsule.
- `tests/fixtures/sample-repo/src/components/button.tsx`: source file matched by this capsule.
- `tests/fixtures/sample-repo/src/db/schema.ts`: source file matched by this capsule.
- `tests/fixtures/sample-repo/tests/users.test.ts`: source file matched by this capsule.
- `tests/repo-scan.test.ts`: source file matched by this capsule.

## Conventions

- Keep this section updated when durable project conventions are discovered.

## Decisions

- Record stable decisions here so future agents do not rediscover them.

## Agent Hints

- Read this capsule before changing files matched by its sources.
- If this capsule is stale, inspect the changed files before editing.
- Treat this capsule as a source-linked map, not a replacement for source code.
