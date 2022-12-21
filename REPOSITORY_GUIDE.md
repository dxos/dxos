# DXOS Repository Guide

Instructions and documentation for developer workflows in this DXOS repository.

## Branches
| branch | purpose |
| :-- | :-- |
| main | primary (and only) feature integration branch |

## Formatting and linting
Formatting is done by `prettier` and linting by `eslint`. Passing lint is required to merge to `main`.

Run `pnpm lint` to conform the entire repository with (equivalent of `lint --fix`).

Run `pnpm lint:changed` to lint only what you've been working on using `pnpm changed-packages`.
