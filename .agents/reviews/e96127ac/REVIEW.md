---
branch: dm/cool-johnson-qtbvta
commit: e96127acdedbffddb862c4503a1035b62d6e9d21
base: 9d1d6f03dc378ec762c2b90ee8770f6cf03661ad
mode: fast
createdAt: 2026-10-20T07:10:08.602Z
isFinalized: true
groups: 77
rules: [code-not-in-strings, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, per-test-mutable-fixtures]
reviewId: e96127ac
---

_1 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e96127ac-1 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/eval-tool.ts:169
- e96127ac-2 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/format.ts:6
- e96127ac-3 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:84
- e96127ac-4 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148
- e96127ac-5 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:275
- e96127ac-6 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:37
- e96127ac-7 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:55

## Issues

# WARN e96127ac-1 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/eval-tool.ts:169`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.89. The likeliest place is lines 169-179 (`const evalCode = (input: string): string => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e96127ac-2 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/format.ts:6`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 6-16 (`export const formatPrinted = (value: unknown): string => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e96127ac-3 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:84`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.84. The likeliest place is lines 84-97 (`const ScoreOperation: SandboxOperation = {`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN e96127ac-4 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:148`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 148-154 (`),`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN e96127ac-5 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:275`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.85. The likeliest place is lines 275-286 (`EffectDialect,`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e96127ac-6 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:37`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.90. The likeliest place is lines 37-48 (`const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN e96127ac-7 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:55`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 55-70 (`const connect = (port: MessagePort) =>`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `9d1d6f03dc378ec762c2b90ee8770f6cf03661ad`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 99 uncertain, 125 clean, 0 unanswered
- left for an agentic reviewer: 55 batch(es)

```text
requests: 124 (64 verdicts re-asked with context the model requested)
estimated input tokens: 954151
billed input tokens: 898001 (cost $0.0377)
measured chars per token: 3.19
```
