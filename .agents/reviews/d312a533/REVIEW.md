---
branch: dm/exciting-bohr-c3amxz
commit: d312a533533879a0d54af436a8877471cc750272
base: 26f8347f93083445e8cb515ebc67743766b95e97
mode: fast
createdAt: 2026-09-28T04:40:58.744Z
isFinalized: true
groups: 59
rules: [effect-fn-not-hand-wrapped-gen]
reviewId: d312a533
---

_0 error(s), 1 warning(s)._

# WARN d312a533-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-file/src/operations/create-from-source.ts:44`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 44-55 (`const resolveSource = (source: typeof FileOperation.FileSource.Type) =>`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.
