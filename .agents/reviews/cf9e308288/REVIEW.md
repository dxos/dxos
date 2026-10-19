---
branch: dm/dazzling-goldberg-fdw85c
commit: cf9e308288c27474a15e17263ed60806e8597297
base: 6eb949e548a3e5668b79233ed1e07c304878b263
mode: fast
createdAt: 2026-10-19T14:30:37.770Z
isFinalized: true
groups: 199
rules: [effect-fn-not-hand-wrapped-gen, no-casts, no-mixed-promise-effect-lifecycle, no-trivial-wrappers-over-official-apis, no-try-catch-in-effect-code]
reviewId: cf9e308288
---

_2 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- cf9e308288-1 - ignored - no-trivial-wrappers-over-official-apis - packages/common/permission/src/Check.test.ts:41
- cf9e308288-2 - resolved - no-try-catch-in-effect-code - packages/common/permission/src/Check.ts:223
- cf9e308288-3 - ignored - no-casts - packages/core/compute/compute-runtime/src/ProcessManager.ts:788
- cf9e308288-4 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/compute/src/Operation.ts:159
- cf9e308288-5 - ignored - no-casts - packages/core/compute/compute/src/Operation.ts:178
- cf9e308288-6 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute/src/Operation.ts:851
- cf9e308288-7 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Process.ts:557

## Issues

# WARN cf9e308288-1 no-trivial-wrappers-over-official-apis `packages/common/permission/src/Check.test.ts:41`

System One judges this a likely violation of `no-trivial-wrappers-over-official-apis` (Do not extract a helper that only forwards to an official API), p=0.80. The likeliest place is lines 41-44 (`const check = (options: Omit<Check.CheckOptions, 'now'> & { now?: number }) =>`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf9e308288-2 no-try-catch-in-effect-code `packages/common/permission/src/Check.ts:223`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 223-234 (`export const check: (options: CheckOptions) => Effect.Effect<Result> = Effect...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cf9e308288-3 no-casts `packages/core/compute/compute-runtime/src/ProcessManager.ts:788`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 788-811 (`const defRaw = definition as unknown as { input: Schema.Codec<any, any, never...`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf9e308288-4 no-mixed-promise-effect-lifecycle `packages/core/compute/compute/src/Operation.ts:159`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.89. The likeliest place is lines 159-177 (`export interface LazyHandler<Def extends Definition.Any = Definition.Any> {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# ERROR cf9e308288-5 no-casts `packages/core/compute/compute/src/Operation.ts:178`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.97. The likeliest place is lines 178-212 (`export const lazyHandler: {`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf9e308288-6 no-try-catch-in-effect-code `packages/core/compute/compute/src/Operation.ts:851`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 851-882 (`icon: operation.meta.icon,`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN cf9e308288-7 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Process.ts:557`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 557-574 (`export const spawn = <I, O, Rpcs extends Rpc.Any = never>(`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6eb949e548a3e5668b79233ed1e07c304878b263`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 245 uncertain, 1329 clean, 0 unanswered
- left for an agentic reviewer: 84 batch(es)

```text
requests: 663 (166 verdicts re-asked with context the model requested)
estimated input tokens: 5470490
billed input tokens: 5086993 (cost $0.2137)
measured chars per token: 3.23
```
