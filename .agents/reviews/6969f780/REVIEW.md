---
branch: dm/busy-feynman-ie018x
commit: 6969f780d7161a851d194a12445b98d78bf03dd1
base: 073aef849bfc554dd5c0ed5c116c8786582cfb5e
mode: fast
createdAt: 2026-10-07T06:21:00.909Z
isFinalized: true
groups: 112
rules: [effect-fn-not-hand-wrapped-gen, errors-extend-base-error, extract-non-rendering-logic-from-component, import-as-namespace-is-all-or-nothing, no-casts, no-mixed-promise-effect-lifecycle]
reviewId: 6969f780
---

_4 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 6969f780-1 - ignored - no-casts - packages/apps/composer-app/src/functions/_worker.test.ts:21
- 6969f780-2 - resolved - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-runtime/src/agent-service/skill-hooks.test.ts:97
- 6969f780-3 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/types/Skill.ts:305
- 6969f780-4 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57
- 6969f780-5 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:127
- 6969f780-6 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-assistant/src/skills/turn-review/index.ts:1
- 6969f780-7 - ignored - no-casts - packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:23
- 6969f780-8 - ignored - no-casts - packages/plugins/plugin-support/src/types/SupportService.test.ts:14
- 6969f780-9 - ignored - no-mixed-promise-effect-lifecycle - packages/sdk/observability/src/ObservabilityExtension.ts:190

## Issues

# ERROR 6969f780-1 no-casts `packages/apps/composer-app/src/functions/_worker.test.ts:21`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 21-34 (`const archive = {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6969f780-2 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-runtime/src/agent-service/skill-hooks.test.ts:97`

**Resolved:** Fixed: `agentProcess` is now `Effect.fnUntraced`.

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 97-103 (`const agentProcess = (session: { chat: Obj.Unknown }) =>`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6969f780-3 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/types/Skill.ts:305`

**Dismissed:** Pre-existing: `Skill.resolve` predates this PR; the diff only adds `Hook.async` and the `Hook` type.

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.91. The likeliest place is lines 305-316 (`export const resolve = (key: string): Effect.Effect<Skill, NotFoundError, Reg...`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6969f780-4 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/SpaceHomePrompt/SpaceHomePrompt.tsx:57`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 57-68 (`});`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 6969f780-5 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:127`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 127-153 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6969f780-6 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/skills/turn-review/index.ts:1`

**Dismissed:** False positive: `turn-review/index.ts` re-exports one namespace module by name, the same shape as `assistant/index.ts`; `TurnReviewSkill.ts` carries the directive and every import site uses `TurnReviewSkill.`.

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.81. The likeliest place is lines 1-6 (`export * as TurnReviewSkill from './TurnReviewSkill.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.71. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 6969f780-7 no-casts `packages/plugins/plugin-support/src/containers/FeedbackPanel/FeedbackPanel.stories.tsx:23`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 23-37 (`const makeObservability = (): Observability.Observability =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 6969f780-8 no-casts `packages/plugins/plugin-support/src/types/SupportService.test.ts:14`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 14-19 (`const observabilityWith = (`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 6969f780-9 no-mixed-promise-effect-lifecycle `packages/sdk/observability/src/ObservabilityExtension.ts:190`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.80. The likeliest place is lines 190-197 (`export type Support = {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `073aef849bfc554dd5c0ed5c116c8786582cfb5e`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 161 uncertain, 770 clean, 0 unanswered
- left for an agentic reviewer: 59 batch(es)

```text
requests: 414 (91 verdicts re-asked with context the model requested)
estimated input tokens: 3467329
billed input tokens: 3223763 (cost $0.1354)
measured chars per token: 3.23
```
