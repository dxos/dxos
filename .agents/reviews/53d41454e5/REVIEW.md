---
branch: claude/code-mode-console-log-dc0b10
commit: 53d41454e59de6ff98e1c0d251e09a20f94d096e
base: 4a7f70b028960f8b2a449bfe1c98578636db52ea
mode: fast
createdAt: 2026-11-19T22:27:59.545Z
isFinalized: true
groups: 87
rules: [call-effect-api-not-promise-bridge, code-not-in-strings, errors-extend-base-error, flat-layer-composition, no-casts, no-mixed-promise-effect-lifecycle, no-sleep-in-test, no-try-catch-in-effect-code, per-test-mutable-fixtures]
reviewId: 53d41454e5
---

_3 error(s), 15 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 53d41454e5-1 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/code-mode.test.ts:88
- 53d41454e5-2 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/code-mode.test.ts:176
- 53d41454e5-3 - ignored - call-effect-api-not-promise-bridge - packages/core/compute/agent-code-mode/src/code-mode.test.ts:580
- 53d41454e5-4 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/describe.test.ts:66
- 53d41454e5-5 - ignored - flat-layer-composition - packages/core/compute/agent-code-mode/src/describe.test.ts:417
- 53d41454e5-6 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:31
- 53d41454e5-7 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:144
- 53d41454e5-8 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/eval-tool.ts:307
- 53d41454e5-9 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerdSandbox.ts:182
- 53d41454e5-10 - ignored - no-casts - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:86
- 53d41454e5-11 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:175
- 53d41454e5-12 - ignored - no-sleep-in-test - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:391
- 53d41454e5-13 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- 53d41454e5-14 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77
- 53d41454e5-15 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:111
- 53d41454e5-16 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:88
- 53d41454e5-17 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:176
- 53d41454e5-18 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:279

## Issues

# WARN 53d41454e5-1 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/code-mode.test.ts:88`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 88-103 (`const testLayerOptions = {`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-2 code-not-in-strings `packages/core/compute/agent-code-mode/src/code-mode.test.ts:176`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.88. The likeliest place is lines 176-199 (`describe('code mode', { tags: ['model-fixture'] }, () => {`, location confidence 0.29). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-3 call-effect-api-not-promise-bridge `packages/core/compute/agent-code-mode/src/code-mode.test.ts:580`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.88. The likeliest place is lines 580-603 (`yield* call(PlainDialect, 'plain', "print(await ops.score({ title: 'abc' }));...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-4 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/describe.test.ts:66`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.87. The likeliest place is lines 66-82 (`const lastToolResult = ({ prompt }: ScriptedLanguageModel.ScriptedRequest): s...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-5 flat-layer-composition `packages/core/compute/agent-code-mode/src/describe.test.ts:417`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.83. The likeliest place is lines 417-429 (`TestHelpers.provideTestContext,`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 53d41454e5-6 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:31`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.92. The likeliest place is lines 31-42 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 53d41454e5-7 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:144`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.82. The likeliest place is lines 144-155 (`ref: (obj: Obj.Unknown) => Ref.make(obj),`, location confidence 0.54). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-8 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/eval-tool.ts:307`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 307-317 (`const evalCode = (input: string): string => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-9 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerdSandbox.ts:182`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.85. The likeliest place is lines 182-189 (`const modules = (code: string): Record<string, { js: string }> => ({`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 53d41454e5-10 no-casts `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:86`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 86-97 (`return { id: `obj-${++next}`, typename, ...props } as Row;`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-11 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:175`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.89. The likeliest place is lines 175-186 (`const { rows, run } = setup();`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-12 no-sleep-in-test `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:391`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.89. The likeliest place is lines 391-402 (`test('an abandoned evaluation cannot write after its budget', async () => {`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-13 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.83. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-14 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:77`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 77-88 (`const hostOperations: Operation.OperationService = {`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-15 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:111`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.92. The likeliest place is lines 111-122 (`yield* Database.flush();`, location confidence 0.38). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-16 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:88`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 88-101 (`const ScoreOperation: SandboxOperation = {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-17 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:176`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 176-182 (`),`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 53d41454e5-18 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:279`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.89. The likeliest place is lines 279-290 (`const output = await run(`print(await describe(await ops.lookup({ id: '${task...`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### Triage

Every issue is `ignored`; none points at a defect this PR adds.

- Pre-existing code this PR does not change: 1, 3, 4 (module-level fixtures and the invocation-recording test),
  6 (`UnknownObjectTypeError`), 7 (the `update` mutator's `any`), 8 (`evalCode`'s JSON parse, not Effect code),
  10 (the fake workspace's `as Row`), 12 (the abandoned-isolate test's wait), 13, 14, 16, 17 (the host
  `OperationService` stand-ins, whose `invokePromise` the interface requires). The same rules on the same code were
  ignored in review 007abd9f81.
- Code in strings that has to be a string: 2, 11, 15, 18 are `eval` programs, which the tool takes as a string;
  9 is `WorkerdSandbox`'s `program.mjs`, which wraps the model's code and so cannot be a static file.
- 5: the new test provides the module-level `TestLayer` once, as every other test in `describe.test.ts` does.

### System One pass

- model: jev-latest
- base for context: `4a7f70b028960f8b2a449bfe1c98578636db52ea`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 18 violations written to fragments, 316 uncertain, 188 clean, 0 unanswered
- left for an agentic reviewer: 74 batch(es)

```text
requests: 278 (203 verdicts re-asked with context the model requested)
estimated input tokens: 3038652
billed input tokens: 2923235 (cost $0.1228)
measured chars per token: 3.12
```
