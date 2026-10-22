---
branch: dm/confident-maxwell-narknv
commit: e2c5a385771c4588a376a11c3abe8df6a0b7909c
base: 9d66bcd4eb0db0a525c2eaa101acbf7111984262
mode: fast
createdAt: 2026-10-22T09:09:30.581Z
isFinalized: true
groups: 92
rules: [effect-fn-not-hand-wrapped-gen, named-durations-and-budgets]
reviewId: e2c5a385
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e2c5a385-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/shogi/features.ts:67
- e2c5a385-2 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/shogi/project.ts:96
- e2c5a385-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/shogi/spec.ts:24
- e2c5a385-4 - ignored - named-durations-and-budgets - packages/plugins/plugin-projects/src/templates/composer-plugin.ts:148

## Issues

# WARN e2c5a385-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/shogi/features.ts:67`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 67-78 (`export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInp...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `run` is a `SampleSpace.partial` callback, and every partial in the repo (crm, fieldstone, worker, canvas architecture) writes it as `() => Effect.gen(...)`; this template follows that shape.

# WARN e2c5a385-2 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/shogi/project.ts:96`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.81. The likeliest place is lines 96-107 (`export const ProjectPartial: SampleSpace.Partial<ProjectResult, ProjectInput>...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `run` is a `SampleSpace.partial` callback, and every partial in the repo (crm, fieldstone, worker, canvas architecture) writes it as `() => Effect.gen(...)`; this template follows that shape.

# WARN e2c5a385-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/shogi/spec.ts:24`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 24-38 (`export const SpecPartial: SampleSpace.Partial<SpecResult> = SampleSpace.parti...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `run` is a `SampleSpace.partial` callback, and every partial in the repo (crm, fieldstone, worker, canvas architecture) writes it as `() => Effect.gen(...)`; this template follows that shape.

# WARN e2c5a385-4 named-durations-and-budgets `packages/plugins/plugin-projects/src/templates/composer-plugin.ts:148`

System One judges this a likely violation of `named-durations-and-budgets` (Write durations as unit arithmetic and time budgets as shared named strategies), p=0.94. The likeliest place is lines 148-159 (``Fetch it with \`curl -fsSL https://raw.githubusercontent.com/dxos/dxos/${too...`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** the flagged timeouts are World Clock's existing prompt text, which this PR does not change (it only exports helpers from the file); the Shogi brief's own timeouts are named (`INSTALL_TIMEOUT_MS`, `PUBLISH_TIMEOUT_MS`).

## Appendix

### System One pass

- model: jev-latest
- base for context: `9d66bcd4eb0db0a525c2eaa101acbf7111984262`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 228 uncertain, 327 clean, 0 unanswered
- left for an agentic reviewer: 65 batch(es)

```text
requests: 329 (151 verdicts re-asked with context the model requested)
estimated input tokens: 1620576
billed input tokens: 1498449 (cost $0.0629)
measured chars per token: 3.24
```
