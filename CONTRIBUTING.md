# Contributing

Thanks for helping improve Capsule.

Capsule is early, so the most useful contributions are:

- testing Capsule on real repositories
- improving capsule templates
- improving source grouping
- adding agent snippets
- tightening stale detection
- documenting confusing behavior

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

## Principles

- Keep v0 local-only.
- Do not add paid LLM calls to the core CLI.
- Keep capsules human-readable Markdown.
- Prefer simple deterministic behavior before clever automation.
- Treat capsules as source-linked maps, not source-code replacements.

## Pull Requests

Please include:

- what changed
- why it matters
- tests or manual verification
- any behavior that may affect existing `.capsules/` files
