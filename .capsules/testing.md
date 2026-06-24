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
    "tests/capsule-merge.test.ts": "sha256:3ea9b22ff36ed98754942ae7a990042ab6c8979b004609e4fa6c6dcddb7dd806",
    "tests/cli.test.ts": "sha256:89684fc27f8210d36af36bb6a0d327bcd9a4d84d450f7359b30fe24d3e3fe35c",
    "tests/estimate.test.ts": "sha256:1efeabf01e43006ff6c60dc396606d1a09dea85f858ade1d7f987aa68dfd52fb",
    "tests/fingerprint.test.ts": "sha256:ac224581259212e5cf77f2875114bcb86c87747462d01e9f432428c2409171da",
    "tests/fixtures/sample-repo/README.md": "sha256:504c93c0602db99e83b1f46edb699375a33b3018c0a4f8b7c707a3a470539b31",
    "tests/fixtures/sample-repo/package.json": "sha256:290c50f39b9050e62c552d25f8c5ed4d3632dc80e447cbadac3ba1e13ab33eb8",
    "tests/fixtures/sample-repo/src/api/users.ts": "sha256:87a34b537e20aea9f2f907145b6cde73f93211a3fb3d3e74ff6045bef0a91366",
    "tests/fixtures/sample-repo/src/components/button.tsx": "sha256:481f5ce3579804ec18e2414f661b9464a24f50710c8f7ca014699bff34a7110d",
    "tests/fixtures/sample-repo/src/db/schema.ts": "sha256:bce205a16dd5a1f7fe753d015d4b6b74a54ff457b67ac16da67adafd5422845c",
    "tests/fixtures/sample-repo/tests/users.test.ts": "sha256:714024ded73b57beac0ca95dc36011c3e86823027c16845c467ba5d9fb789a96",
    "tests/repo-scan.test.ts": "sha256:df769a1d85b7d9cf9be184da014ec7c21b66ba403dd63e944e9b6c1e875448e1"
  },
  "updated_at": "2026-06-24T11:25:44.891Z"
}
---
# Testing Capsule

## Purpose

Automated tests, fixtures, mocks, and quality gates.

## Key Files

- `tests/capsule-format.test.ts`: source module.
- `tests/capsule-merge.test.ts`: source module.
- `tests/cli.test.ts`: source module.
- `tests/estimate.test.ts`: source module.
- `tests/fingerprint.test.ts`: source module.
- `tests/fixtures/sample-repo/README.md`: project documentation.
- `tests/fixtures/sample-repo/package.json`: project manifest.
- `tests/fixtures/sample-repo/src/api/users.ts`: exports `users`.
- `tests/fixtures/sample-repo/src/components/button.tsx`: exports `Button`.
- `tests/fixtures/sample-repo/src/db/schema.ts`: exports `schema`.
- `tests/fixtures/sample-repo/tests/users.test.ts`: exports `sampleTestFile`.
- `tests/repo-scan.test.ts`: source module.

## API Surface

- `tests/fixtures/sample-repo/src/api/users.ts`: users
- `tests/fixtures/sample-repo/src/components/button.tsx`: Button(): void
- `tests/fixtures/sample-repo/src/db/schema.ts`: schema
- `tests/fixtures/sample-repo/tests/users.test.ts`: sampleTestFile

## Conventions

- Keep this section updated when durable project conventions are discovered.

## Decisions

- Record stable decisions here so future agents do not rediscover them.

## Agent Hints

- Read this capsule before changing files matched by its sources.
- If this capsule is stale, inspect the changed files before editing.
- Treat this capsule as a source-linked map, not a replacement for source code.
