---
name: no-sleep-in-test
title: No sleep or polling in tests
scope: repo
files:
  - 'packages/**/*.test.ts'
  - 'packages/**/*.test.tsx'
grep: sleep|setTimeout|setInterval
severity: warn
---

Tests must not use `sleep`, `setTimeout`/`setInterval`-based waits, or busy-poll
loops to synchronize with async work — they make tests slow and flaky.

Flag any such usage. Prefer subscribing to the event or state change being
awaited: a `Trigger`, `waitForCondition`, an ECHO query subscription, or Effect
`TestClock` (which virtualizes `Effect.sleep`). A real macrotask turn is only
acceptable when the test explicitly needs one across runtimes — say so if you
believe a flagged case is that exception.
