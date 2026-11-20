---
branch: claude/code-mode-console-log-dc0b10
commit: d9081178893f1b2a860f797a9d3d93ec393a732c
base: 4a7f70b028960f8b2a449bfe1c98578636db52ea
mode: fast
createdAt: 2026-11-20T14:37:15.537Z
isFinalized: true
groups: 87
rules: [call-effect-api-not-promise-bridge, code-not-in-strings, errors-extend-base-error, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-try-catch-in-effect-code, per-test-mutable-fixtures]
reviewId: d908117889
---

_3 error(s), 15 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- d908117889-1 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/code-mode.test.ts:25
- d908117889-2 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/code-mode.test.ts:176
- d908117889-3 - ignored - call-effect-api-not-promise-bridge - packages/core/compute/agent-code-mode/src/code-mode.test.ts:580
- d908117889-4 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/describe.test.ts:66
- d908117889-5 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/describe.test.ts:285
- d908117889-6 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:31
- d908117889-7 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:144
- d908117889-8 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/eval-tool.ts:307
- d908117889-9 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerdSandbox.ts:182
- d908117889-10 - ignored - no-casts - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:128
- d908117889-11 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:319
- d908117889-12 - ignored - no-sleep-in-test - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:391
- d908117889-13 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- d908117889-14 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- d908117889-15 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:111
- d908117889-16 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:88
- d908117889-17 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:176
- d908117889-18 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:279

## Issues

# WARN d908117889-1 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/code-mode.test.ts:25`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 25-53 (`import { EffectDialect } from './dialect-effect.ts';`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-2 code-not-in-strings `packages/core/compute/agent-code-mode/src/code-mode.test.ts:176`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.89. The likeliest place is lines 176-199 (`describe('code mode', { tags: ['model-fixture'] }, () => {`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-3 call-effect-api-not-promise-bridge `packages/core/compute/agent-code-mode/src/code-mode.test.ts:580`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.89. The likeliest place is lines 580-603 (`yield* call(PlainDialect, 'plain', "print(await ops.score({ title: 'abc' }));...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-4 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/describe.test.ts:66`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.88. The likeliest place is lines 66-82 (`const lastToolResult = ({ prompt }: ScriptedLanguageModel.ScriptedRequest): s...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-5 code-not-in-strings `packages/core/compute/agent-code-mode/src/describe.test.ts:285`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.82. The likeliest place is lines 285-296 (`const code = `yield* print((yield* Database.query(Filter.id('${feature.id}'))...`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d908117889-6 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:31`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.92. The likeliest place is lines 31-42 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d908117889-7 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:144`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 144-155 (`ref: (obj: Obj.Unknown) => Ref.make(obj),`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-8 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/eval-tool.ts:307`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 307-317 (`const evalCode = (input: string): string => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-9 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerdSandbox.ts:182`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.84. The likeliest place is lines 182-189 (`const modules = (code: string): Record<string, { js: string }> => ({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR d908117889-10 no-casts `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:128`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 128-139 (`const setup = () => {`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-11 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:319`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.89. The likeliest place is lines 319-330 (`await run(``, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-12 no-sleep-in-test `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:391`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.88. The likeliest place is lines 391-402 (`test('an abandoned evaluation cannot write after its budget', async () => {`, location confidence 0.81). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-13 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.81. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.21). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-14 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.85. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-15 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:111`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.92. The likeliest place is lines 111-122 (`yield* Database.flush();`, location confidence 0.44). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-16 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:88`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 88-101 (`const ScoreOperation: SandboxOperation = {`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-17 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:176`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 176-182 (`),`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN d908117889-18 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:279`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.91. The likeliest place is lines 279-290 (`const output = await run(`print(await describe(await ops.lookup({ id: '${task...`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

Every issue is `ignored`; none points at a defect this PR adds. Seventeen carried over from review 53d41454e5.

- Pre-existing code this PR does not change: module-level test fixtures, the invocation-recording test,
  `UnknownObjectTypeError`, the `update` mutator's `any`, `evalCode`'s JSON parse (not Effect code), the fake
  workspace's `as Row`, the abandoned-isolate test's wait, and the host `OperationService` stand-ins, whose
  `invokePromise` the interface requires. Review 007abd9f81 ignored the same rules on the same code.
- Code in strings that has to be a string: the tests' `eval` programs, which the tool takes as a string (d908117889-5
  is one more), and `WorkerdSandbox`'s `program.mjs`, which wraps the model's code and so cannot be a static file.

### System One pass

- model: jev-latest
- base for context: `4a7f70b028960f8b2a449bfe1c98578636db52ea`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 18 violations written to fragments, 319 uncertain, 185 clean, 0 unanswered
- left for an agentic reviewer: 72 batch(es)

```text
requests: 284 (205 verdicts re-asked with context the model requested)
estimated input tokens: 3081293
billed input tokens: 2961804 (cost $0.1244)
measured chars per token: 3.12
```
