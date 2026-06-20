# Security Policy

Capsule reads local repository files and writes Markdown context packs.

## Reporting A Vulnerability

Please do not open public issues for security vulnerabilities.

Email: dawitworkujima@gmail.com

Include:

- affected version or commit
- reproduction steps
- expected impact
- any suggested fix

## Scope

Security-sensitive areas include:

- accidental inclusion of secrets in generated capsules
- unsafe file traversal
- command execution behavior
- dependency supply-chain risk

Capsule should not execute project code while scanning a repository.
