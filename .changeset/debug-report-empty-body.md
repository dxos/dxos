---
'@dxos/plugin-debug': patch
---

The debug console's `report` command now refuses a missing or blank `--body` with a clear message instead of failing inside `support.submitIssue`, and the feedback form rejects a whitespace-only title or description.
