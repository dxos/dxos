---
branch: dm/agent-13-oct-x8ehi8-0y35ai
commit: 7c4bd77910725af9d71cd421e1a924df89abe72e
base: 019891d36286a32a7060cdc0b9412ac52dcd6fe9
mode: fast
createdAt: 2026-10-14T15:55:49.419Z
isFinalized: true
groups: 81
rules: [code-not-in-strings, errors-extend-base-error, no-sleep-in-test, no-try-catch-in-effect-code]
reviewId: 7c4bd779
---

_2 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 7c4bd779-1 - ignored - code-not-in-strings - packages/reflect/deus-lang/src/cli.test.ts:380
- 7c4bd779-2 - resolved - no-sleep-in-test - packages/reflect/deus-lang/src/cli.test.ts:692
- 7c4bd779-3 - ignored - errors-extend-base-error - packages/reflect/deus-lang/src/kernel/host.ts:22
- 7c4bd779-4 - ignored - code-not-in-strings - packages/reflect/deus-lang/src/kernel/jit.ts:350
- 7c4bd779-5 - ignored - code-not-in-strings - packages/reflect/deus-lang/src/kernel/machine.test.ts:40
- 7c4bd779-6 - ignored - errors-extend-base-error - packages/reflect/deus-lang/src/kernel/machine.ts:139
- 7c4bd779-7 - ignored - no-try-catch-in-effect-code - packages/reflect/deus-lang/src/kernel/run.ts:20

## Issues

# WARN 7c4bd779-1 code-not-in-strings `packages/reflect/deus-lang/src/cli.test.ts:380`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.82. The likeliest place is lines 380-403 (`deus('init', ...c);`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7c4bd779-2 no-sleep-in-test `packages/reflect/deus-lang/src/cli.test.ts:692`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 692-715 (`await new Promise((resolve) => setTimeout(resolve, 100));`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7c4bd779-3 errors-extend-base-error `packages/reflect/deus-lang/src/kernel/host.ts:22`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 22-30 (`export class ExitSignal extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7c4bd779-4 code-not-in-strings `packages/reflect/deus-lang/src/kernel/jit.ts:350`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.86. The likeliest place is lines 350-361 (``return function ${name}(env, args) {`,`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7c4bd779-5 code-not-in-strings `packages/reflect/deus-lang/src/kernel/machine.test.ts:40`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.87. The likeliest place is lines 40-51 (`(def "main" (lam ${print('(app (ref "loop") (int 1000000) (int 0))')}))`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 7c4bd779-6 errors-extend-base-error `packages/reflect/deus-lang/src/kernel/machine.ts:139`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 139-195 (`export const listTo = (list: Value): Value[] => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 7c4bd779-7 no-try-catch-in-effect-code `packages/reflect/deus-lang/src/kernel/run.ts:20`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.86. The likeliest place is lines 20-31 (`export const runImage = (image: string, options: RunOptions): RunResult => {`, location confidence 0.66). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `019891d36286a32a7060cdc0b9412ac52dcd6fe9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 174 uncertain, 365 clean, 0 unanswered
- left for an agentic reviewer: 54 batch(es)

```text
requests: 296 (102 verdicts re-asked with context the model requested)
estimated input tokens: 2399949
billed input tokens: 2438745 (cost $0.1024)
measured chars per token: 2.95
```
