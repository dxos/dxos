---
'@dxos/echo': patch
'@dxos/plugin-space': patch
---

Fix type-safety and code-quality issues found by an automated code review: eliminated unsafe type casts across compute, echo, and UI-editor packages, normalized half-applied namespace-import usage, replaced flaky sleep-based test synchronization with deterministic waits, and cleaned up duplicated Effect service-layer wiring.
