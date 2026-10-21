---
branch: dm/confident-maxwell-narknv
commit: 1aa9bc001fa252b45a8ac12f3a49625a16474e0e
base: 074e3e6cb520f294b29626c5420f80cda4a5b572
mode: fast
createdAt: 2026-10-21T17:38:26.312Z
isFinalized: true
groups: 158
rules: [design-tokens-not-raw-spacing-sizing, effect-fn-not-hand-wrapped-gen]
reviewId: 1aa9bc00
---

_0 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1aa9bc00-1 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-code/src/capabilities/create-object.ts:37
- 1aa9bc00-2 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.stories.tsx:36
- 1aa9bc00-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/worker/features.ts:67
- 1aa9bc00-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/worker/project.ts:60
- 1aa9bc00-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/worker/spec.ts:24
- 1aa9bc00-6 - ignored - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-debug/src/samples/worker/tasks.ts:57

## Issues

# WARN 1aa9bc00-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-code/src/capabilities/create-object.ts:37`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.90. The likeliest place is lines 37-48 (`createObject: (props, options) =>`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** this PR only changes the `Spec` import in this file; the `createObject` body predates it.

# WARN 1aa9bc00-2 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-code/src/containers/SpecArticle/SpecArticle.stories.tsx:36`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.84. The likeliest place is lines 36-47 (`const meta = {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** this PR only changes the `Spec` import in this story; the `meta` block predates it.

# WARN 1aa9bc00-3 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/worker/features.ts:67`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 67-78 (`export const FeaturesPartial: SampleSpace.Partial<FeaturesResult, FeaturesInp...`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `run` is a `SampleSpace.partial` callback, and every partial in the repo (crm, fieldstone, canvas architecture) writes it as `() => Effect.gen(...)`; this PR follows that shape rather than diverging in one template.

# WARN 1aa9bc00-4 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/worker/project.ts:60`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 60-71 (`export const ProjectPartial: SampleSpace.Partial<ProjectResult, ProjectInput>...`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `run` is a `SampleSpace.partial` callback, and every partial in the repo (crm, fieldstone, canvas architecture) writes it as `() => Effect.gen(...)`; this PR follows that shape rather than diverging in one template.

# WARN 1aa9bc00-5 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/worker/spec.ts:24`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 24-38 (`export const SpecPartial: SampleSpace.Partial<SpecResult> = SampleSpace.parti...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `run` is a `SampleSpace.partial` callback, and every partial in the repo (crm, fieldstone, canvas architecture) writes it as `() => Effect.gen(...)`; this PR follows that shape rather than diverging in one template.

# WARN 1aa9bc00-6 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-debug/src/samples/worker/tasks.ts:57`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 57-68 (`export const Tasks: SampleSpace.Partial<TasksResult> = SampleSpace.partial('t...`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

**Ignored:** `run` is a `SampleSpace.partial` callback, and every partial in the repo (crm, fieldstone, canvas architecture) writes it as `() => Effect.gen(...)`; this PR follows that shape rather than diverging in one template.

## Appendix

### System One pass

- model: jev-latest
- base for context: `074e3e6cb520f294b29626c5420f80cda4a5b572`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 149 uncertain, 711 clean, 0 unanswered
- left for an agentic reviewer: 75 batch(es)

```text
requests: 375 (95 verdicts re-asked with context the model requested)
estimated input tokens: 1850629
billed input tokens: 1693435 (cost $0.0711)
measured chars per token: 3.28
```
