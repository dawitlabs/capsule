# Capsule

Capsule creates compact, source-linked Markdown context packs for coding agents.

MCP gives agents tools. Skills give agents procedures. Capsules give agents compact project context.

## Why

Large repositories make agents burn tokens rediscovering the same files, decisions, and conventions. Capsule targets a 50-70% reduction in repeated repository-discovery context for large, multi-session agent tasks.

## Commands

```bash
capsule init
capsule scan
capsule write api
capsule get api
capsule stale api
capsule estimate api
```

## Agent Workflow

Agents should:

1. Read `.capsules/index.md`.
2. Load the relevant capsule.
3. Check staleness.
4. Inspect stale source files before editing.
5. Update capsules when durable project knowledge changes.

## Status

Capsule is an early local-first CLI. It does not call paid LLM APIs and does not replace source inspection.
