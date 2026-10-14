---
branch: dm/agent-13-oct-x8ehi8-0y35ai
commit: 3052ae66acc1b408ddd7303b6e12319276462bb3
base: 019891d36286a32a7060cdc0b9412ac52dcd6fe9
mode: fast
createdAt: 2026-10-14T12:00:19.883Z
isFinalized: true
groups: 80
rules: [code-not-in-strings, errors-extend-base-error, namespace-export-with-internal-hiding, no-env-vars-in-low-level-modules, no-try-catch-in-effect-code]
reviewId: 3052ae66
---

_2 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3052ae66-1 - resolved - namespace-export-with-internal-hiding - packages/reflect/deus-lang/src/index.ts:1
- 3052ae66-2 - ignored - errors-extend-base-error - packages/reflect/deus-lang/src/kernel/host.ts:22
- 3052ae66-3 - ignored - code-not-in-strings - packages/reflect/deus-lang/src/kernel/jit.ts:349
- 3052ae66-4 - ignored - code-not-in-strings - packages/reflect/deus-lang/src/kernel/machine.test.ts:39
- 3052ae66-5 - ignored - errors-extend-base-error - packages/reflect/deus-lang/src/kernel/machine.ts:139
- 3052ae66-6 - resolved - no-env-vars-in-low-level-modules - packages/reflect/deus-lang/src/kernel/machine.ts:629
- 3052ae66-7 - ignored - no-try-catch-in-effect-code - packages/reflect/deus-lang/src/kernel/run.ts:17
- 3052ae66-8 - resolved - no-env-vars-in-low-level-modules - packages/reflect/deus-lang/src/kernel/run.ts:29

## Issues

# WARN 3052ae66-1 namespace-export-with-internal-hiding `packages/reflect/deus-lang/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-11 (`export * from './kernel/host.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3052ae66-2 errors-extend-base-error `packages/reflect/deus-lang/src/kernel/host.ts:22`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 22-30 (`export class ExitSignal extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3052ae66-3 code-not-in-strings `packages/reflect/deus-lang/src/kernel/jit.ts:349`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.82. The likeliest place is lines 349-360 (`'if (++M.steps > M.maxSteps) throw new DeusDefect("step budget exhausted");',`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3052ae66-4 code-not-in-strings `packages/reflect/deus-lang/src/kernel/machine.test.ts:39`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.87. The likeliest place is lines 39-50 (`(def "main" (lam ${print('(app (ref "loop") (int 1000000) (int 0))')}))`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 3052ae66-5 errors-extend-base-error `packages/reflect/deus-lang/src/kernel/machine.ts:139`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 139-202 (`export const listTo = (list: Value): Value[] => {`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3052ae66-6 no-env-vars-in-low-level-modules `packages/reflect/deus-lang/src/kernel/machine.ts:629`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.94. The likeliest place is lines 629-652 (`compiler: Compiler | undefined = undefined;`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3052ae66-7 no-try-catch-in-effect-code `packages/reflect/deus-lang/src/kernel/run.ts:17`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 17-28 (`export const runImage = (image: string, options: HostOptions): RunResult => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3052ae66-8 no-env-vars-in-low-level-modules `packages/reflect/deus-lang/src/kernel/run.ts:29`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.82. The likeliest place is lines 29-40 (`if (process.env.DEUS_JIT !== '0' && !machine.profile && !machine.trace) {`, location confidence 1.00). Judged with added `importers, package` context after a first pass of 0.68. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `019891d36286a32a7060cdc0b9412ac52dcd6fe9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 165 uncertain, 333 clean, 1 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 277 (91 verdicts re-asked with context the model requested)
estimated input tokens: 1955790
failed requests: 1 (their pairs are listed as unanswered)
billed input tokens: 1965113 (cost $0.0825)
measured chars per token: 2.97
```
