---
'@dxos/echo': minor
---

Add ECHO-core per-object time travel and subtree branching: `setTimeTravel`/`clearTimeTravel` pin a live object to a historical version (writes throw, `latestOnly` subscribers stay live), `createBranch`/`switchBranch`/`mergeBranch`/`deleteBranch` fork an object subtree into writable CRDT branches with shared history and true merge-back, and `db.branch()` returns caller-owned writable per-surface branch bindings.
