---
name: workspace-deps
title: In-repo deps use workspace protocol
scope: repo
files:
  - 'packages/**/package.json'
grep: '@dxos/'
severity: error
---

Any in-repo `@dxos/*` dependency must use the workspace protocol, never a version
range or the catalog (the catalog is for external packages only).

Flag an `@dxos/*` entry in `dependencies`/`devDependencies` that is not
`workspace:*`. In `peerDependencies` it must be `workspace:^` (caret) — a
`workspace:*` peer reads as out-of-range on any bump and cascades a spurious
major, so flag a `*` peer too. Ignore `@dxos/*` names that are external to this
monorepo, if any.
