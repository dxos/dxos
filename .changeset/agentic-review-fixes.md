---
'@dxos/plugin-inbox': patch
---

`DraftEmailAndOpen` now reads its database from `Database.Service` instead of taking a `db` input, so callers pass the space through the invoke options. Also removes casts, orphaned JSDoc and hand-written layout wrappers flagged by the agentic review.
