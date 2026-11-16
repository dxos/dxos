---
branch: HEAD
commit: c98d037d1ea03414c861ec21aa8a60cfe53d4c45
base: 59fc72783e8785ca7aab743ef5695b761af8741d
mode: fast
createdAt: 2026-11-12T18:04:35.229Z
isFinalized: true
groups: 85
rules: [effect-fn-not-hand-wrapped-gen, flat-layer-composition, one-changeset-per-pr, operations-resolve-database-from-service]
reviewId: c98d037d
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c98d037d-1 - resolved - one-changeset-per-pr - .changeset/deus-changelog-duplicate-id.md:1
- c98d037d-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:35
- c98d037d-3 - resolved - flat-layer-composition - packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:80
- c98d037d-4 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-space/src/types/SpaceOperation.ts:453

## Issues

# WARN c98d037d-1 one-changeset-per-pr `.changeset/deus-changelog-duplicate-id.md:1`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.97. This is a single-shot classifier: confirm against the rule before acting.

# WARN c98d037d-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:35`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 35-50 (`const addNotes = (count: number) =>`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN c98d037d-3 flat-layer-composition `packages/plugins/plugin-assistant/src/operations/generate-home-suggestions.test.ts:80`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 80-95 (`const scriptedGenerations = () => {`, location confidence 0.96). This is a single-shot classifier: confirm against the rule before acting.

# WARN c98d037d-4 operations-resolve-database-from-service `packages/plugins/plugin-space/src/types/SpaceOperation.ts:453`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.98. The likeliest place is lines 453-468 (`export const Snapshot = Operation.make({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `59fc72783e8785ca7aab743ef5695b761af8741d`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 191 uncertain, 192 clean, 0 unanswered
- left for an agentic reviewer: 66 batch(es)

```text
requests: 208 (127 verdicts re-asked with context the model requested)
estimated input tokens: 2001717
billed input tokens: 1929637 (cost $0.0810)
measured chars per token: 3.11
```
