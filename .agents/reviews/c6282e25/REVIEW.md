---
branch: dm/agent-13-oct-x8ehi8-0y35ai
commit: c6282e25688c6c2f45831cfe2c6ea09d463dc5c2
base: 019891d36286a32a7060cdc0b9412ac52dcd6fe9
mode: fast
createdAt: 2026-10-14T13:37:53.606Z
isFinalized: true
groups: 78
rules: [code-not-in-strings, errors-extend-base-error, no-try-catch-in-effect-code]
reviewId: c6282e25
---

_2 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- c6282e25-1 - ignored - errors-extend-base-error - packages/reflect/deus-lang/src/kernel/host.ts:22
- c6282e25-2 - ignored - code-not-in-strings - packages/reflect/deus-lang/src/kernel/jit.ts:350
- c6282e25-3 - ignored - code-not-in-strings - packages/reflect/deus-lang/src/kernel/machine.test.ts:40
- c6282e25-4 - ignored - errors-extend-base-error - packages/reflect/deus-lang/src/kernel/machine.ts:139
- c6282e25-5 - ignored - no-try-catch-in-effect-code - packages/reflect/deus-lang/src/kernel/run.ts:20

## Issues

# ERROR c6282e25-1 errors-extend-base-error `packages/reflect/deus-lang/src/kernel/host.ts:22`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 22-30 (`export class ExitSignal extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN c6282e25-2 code-not-in-strings `packages/reflect/deus-lang/src/kernel/jit.ts:350`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.81. The likeliest place is lines 350-361 (`'for (;;) {',`, location confidence 0.79). This is a single-shot classifier: confirm against the rule before acting.

# WARN c6282e25-3 code-not-in-strings `packages/reflect/deus-lang/src/kernel/machine.test.ts:40`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.87. The likeliest place is lines 40-51 (`(def "main" (lam ${print('(app (ref "loop") (int 1000000) (int 0))')}))`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# ERROR c6282e25-4 errors-extend-base-error `packages/reflect/deus-lang/src/kernel/machine.ts:139`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 139-195 (`export const listTo = (list: Value): Value[] => {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN c6282e25-5 no-try-catch-in-effect-code `packages/reflect/deus-lang/src/kernel/run.ts:20`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 20-31 (`export const runImage = (image: string, options: RunOptions): RunResult => {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `019891d36286a32a7060cdc0b9412ac52dcd6fe9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 169 uncertain, 367 clean, 0 unanswered
- left for an agentic reviewer: 52 batch(es)

```text
requests: 292 (94 verdicts re-asked with context the model requested)
estimated input tokens: 2061180
billed input tokens: 2080547 (cost $0.0874)
measured chars per token: 2.97
```
