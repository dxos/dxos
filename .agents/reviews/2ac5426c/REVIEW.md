---
branch: dm/delegation-stories-ovcgrd
commit: 2ac5426c9225513d187bce3c4d8bbbcfc505907c
base: 0471a3a979aadf9d9acdab5d0d7d1756eb79e7c4
mode: fast
createdAt: 2026-11-26T15:23:12.584Z
isFinalized: true
groups: 216
rules: [call-effect-api-not-promise-bridge, code-not-in-strings, dependency-direction, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, flat-layer-composition, import-as-namespace-is-all-or-nothing, mutate-echo-arrays-with-splice, namespace-export-with-internal-hiding, no-casts, no-lint-suppression-to-pass, no-mixed-promise-effect-lifecycle, no-try-catch-in-effect-code, per-test-mutable-fixtures]
reviewId: 2ac5426c
---

_5 error(s), 34 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2ac5426c-1 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/code-mode.test.ts:41
- 2ac5426c-2 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/code-mode.test.ts:186
- 2ac5426c-3 - ignored - call-effect-api-not-promise-bridge - packages/core/compute/agent-code-mode/src/code-mode.test.ts:712
- 2ac5426c-4 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-code-mode/src/code-mode.test.ts:877
- 2ac5426c-5 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/describe.test.ts:69
- 2ac5426c-6 - ignored - flat-layer-composition - packages/core/compute/agent-code-mode/src/describe.test.ts:111
- 2ac5426c-7 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/describe.test.ts:289
- 2ac5426c-8 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-effect.ts:339
- 2ac5426c-9 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/agent-code-mode/src/dialect-effect.ts:455
- 2ac5426c-10 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/docs.test.ts:99
- 2ac5426c-11 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/eval-tool.ts:333
- 2ac5426c-12 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/producer.test.ts:338
- 2ac5426c-13 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/producer.ts:374
- 2ac5426c-14 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/Sandbox.ts:19
- 2ac5426c-15 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerdSandbox.ts:185
- 2ac5426c-16 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:53
- 2ac5426c-17 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:80
- 2ac5426c-18 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:102
- 2ac5426c-19 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:91
- 2ac5426c-20 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:192
- 2ac5426c-21 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:300
- 2ac5426c-22 - ignored - no-casts - packages/core/compute/agent-code-mode/src/WorkerSandbox.ts:439
- 2ac5426c-23 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:37
- 2ac5426c-24 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:274
- 2ac5426c-25 - ignored - no-lint-suppression-to-pass - packages/core/compute/assistant-evals/src/evals/code-mode-locks.eval.ts:243
- 2ac5426c-26 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/assistant-evals/src/evals/code-mode.eval.ts:92
- 2ac5426c-27 - ignored - dependency-direction - packages/core/compute/assistant-evals/src/evals/code-mode.eval.ts:449
- 2ac5426c-28 - ignored - errors-extend-base-error - packages/core/compute/assistant-evals/src/runner.ts:49
- 2ac5426c-29 - ignored - flat-layer-composition - packages/core/compute/assistant-evals/src/runner.ts:612
- 2ac5426c-30 - ignored - no-mixed-promise-effect-lifecycle - packages/core/compute/assistant-evals/src/Scorer.ts:252
- 2ac5426c-31 - ignored - import-as-namespace-is-all-or-nothing - packages/core/compute/assistant-evals/src/Transcript.ts:1
- 2ac5426c-32 - ignored - no-try-catch-in-effect-code - packages/core/compute/assistant-evals/src/Transcript.ts:55
- 2ac5426c-33 - ignored - mutate-echo-arrays-with-splice - packages/core/compute/compute/src/Agent.ts:202
- 2ac5426c-34 - ignored - effect-fn-not-hand-wrapped-gen - packages/core/compute/compute/src/Agent.ts:313
- 2ac5426c-35 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:332
- 2ac5426c-36 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-assistant/src/ChatRequest.ts:1
- 2ac5426c-37 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-assistant/src/index.ts:1
- 2ac5426c-38 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-sheet/src/index.ts:1
- 2ac5426c-39 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-sheet/src/skills/index.ts:1

## Issues

# WARN 2ac5426c-1 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/code-mode.test.ts:41`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.85. The likeliest place is lines 41-63 (`const untrailed = (text: string): string => text.replace(`\n\n${STATE_TRAILER...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-2 code-not-in-strings `packages/core/compute/agent-code-mode/src/code-mode.test.ts:186`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.88. The likeliest place is lines 186-209 (`describe('code mode', { tags: ['model-fixture'] }, () => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-3 call-effect-api-not-promise-bridge `packages/core/compute/agent-code-mode/src/code-mode.test.ts:712`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.88. The likeliest place is lines 712-735 (`yield* call(PlainDialect, 'plain', "print(await ops.score({ title: 'abc' }));...`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-4 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-code-mode/src/code-mode.test.ts:877`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 877-900 (`providerExecuted: false,`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-5 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/describe.test.ts:69`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.88. The likeliest place is lines 69-86 (`const lastToolResult = ({ prompt }: ScriptedLanguageModel.ScriptedRequest): s...`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-6 flat-layer-composition `packages/core/compute/agent-code-mode/src/describe.test.ts:111`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 111-120 (`const run = Effect.fnUntraced(function* (`, location confidence 0.26). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-7 code-not-in-strings `packages/core/compute/agent-code-mode/src/describe.test.ts:289`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.83. The likeliest place is lines 289-300 (`const code = `yield* print((yield* Database.query(Filter.id('${feature.id}'))...`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2ac5426c-8 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-effect.ts:339`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.92. The likeliest place is lines 339-342 (`class ArgumentError extends Schema.TaggedError<ArgumentError>('ArgumentError'...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-9 effect-fn-not-hand-wrapped-gen `packages/core/compute/agent-code-mode/src/dialect-effect.ts:455`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.82. The likeliest place is lines 455-466 (`export const searchAll = (`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-10 code-not-in-strings `packages/core/compute/agent-code-mode/src/docs.test.ts:99`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.92. The likeliest place is lines 99-112 (`const SETUP = ``, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-11 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/eval-tool.ts:333`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 333-343 (`const evalCode = (input: string): string => {`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-12 code-not-in-strings `packages/core/compute/agent-code-mode/src/producer.test.ts:338`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.81. The likeliest place is lines 338-349 (`code:`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-13 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/producer.ts:374`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.92. The likeliest place is lines 374-386 (`const operationBehind = (tool: Tool.Any): Operation.Definition.Any | undefine...`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2ac5426c-14 errors-extend-base-error `packages/core/compute/agent-code-mode/src/Sandbox.ts:19`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 19-23 (`export class EvaluationError extends Schema.TaggedError<EvaluationError>('Eva...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-15 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerdSandbox.ts:185`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.83. The likeliest place is lines 185-192 (`const modules = (code: string): Record<string, { js: string }> => ({`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-16 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:53`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.84. The likeliest place is lines 53-59 (`const File = Operation.make({`, location confidence 0.20). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-17 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:80`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 80-91 (`const hostOperations: Operation.OperationService = {`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-18 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandbox.browser.test.ts:102`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.89. The likeliest place is lines 102-113 (`describe('worker sandbox in a Web Worker', () => {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-19 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:91`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 91-104 (`const ScoreOperation: SandboxOperation = {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-20 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:192`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.84. The likeliest place is lines 192-203 (`return {`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-21 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerSandbox.test.ts:300`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.92. The likeliest place is lines 300-311 (`const output = await run(`print(await describe(await ops.lookup({ id: '${task...`, location confidence 0.28). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2ac5426c-22 no-casts `packages/core/compute/agent-code-mode/src/WorkerSandbox.ts:439`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 439-448 (`const toMessagePort = (port: WorkerThreads.MessagePort): MessagePort => port ...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2ac5426c-23 errors-extend-base-error `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:37`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.89. The likeliest place is lines 37-49 (`const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-24 no-mixed-promise-effect-lifecycle `packages/core/compute/agent-code-mode/src/WorkerSandboxRuntime.ts:274`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 274-285 (`const forwardOperations = (`, location confidence 0.51). Judged with added `importers, imports` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-25 no-lint-suppression-to-pass `packages/core/compute/assistant-evals/src/evals/code-mode-locks.eval.ts:243`

System One judges this a likely violation of `no-lint-suppression-to-pass` (Don't add a lint-disable comment to get past a rule; fix what it points at), p=0.83. The likeliest place is lines 243-254 (`const makeOpener = (mechanism: string, key: string) => {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-26 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-evals/src/evals/code-mode.eval.ts:92`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.88. The likeliest place is lines 92-110 (`const SEEDED = [`, location confidence 0.34). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-27 dependency-direction `packages/core/compute/assistant-evals/src/evals/code-mode.eval.ts:449`

System One judges this a likely violation of `dependency-direction` (Lower-level packages never import from higher-level ones), p=0.83. The likeliest place is lines 449-472 (`if (viewState === undefined) {`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 2ac5426c-28 errors-extend-base-error `packages/core/compute/assistant-evals/src/runner.ts:49`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 49-69 (`import { trim } from '@dxos/util';`, location confidence 0.83). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-29 flat-layer-composition `packages/core/compute/assistant-evals/src/runner.ts:612`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 612-635 (`Database.Service,`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-30 no-mixed-promise-effect-lifecycle `packages/core/compute/assistant-evals/src/Scorer.ts:252`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 252-262 (`export type Session = {`, location confidence 0.81). Judged with added `importers, imports` context after a first pass of 0.76. This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-31 import-as-namespace-is-all-or-nothing `packages/core/compute/assistant-evals/src/Transcript.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.83. The likeliest place is lines 1-15 (`import { mkdir, writeFile } from 'node:fs/promises';`, location confidence 0.48). Judged with added `importers` context after a first pass of 0.73. This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-32 no-try-catch-in-effect-code `packages/core/compute/assistant-evals/src/Transcript.ts:55`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.84. The likeliest place is lines 55-62 (`const tryParse = (value: string): unknown => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-33 mutate-echo-arrays-with-splice `packages/core/compute/compute/src/Agent.ts:202`

System One judges this a likely violation of `mutate-echo-arrays-with-splice` (Remove or reorder entries of an ECHO array with splice, never by reassigning the array), p=0.89. The likeliest place is lines 202-224 (`}`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-34 effect-fn-not-hand-wrapped-gen `packages/core/compute/compute/src/Agent.ts:313`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.86. The likeliest place is lines 313-329 (`export const loadTasks = (session: Session): Effect.Effect<Task.Task[], never...`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-35 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:332`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.83. The likeliest place is lines 332-345 (`const operationRecord = (handler: Operation.WithHandler<Operation.Definition....`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-36 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-assistant/src/ChatRequest.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.87. The likeliest place is lines 1-8 (`export { type ChatRequestContext as Context, createPromptContent } from './ch...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-37 namespace-export-with-internal-hiding `packages/plugins/plugin-assistant/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.83. The likeliest place is lines 1-14 (`export * as AssistantPlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-38 namespace-export-with-internal-hiding `packages/plugins/plugin-sheet/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.93. The likeliest place is lines 1-8 (`export * as SheetPlugin from '#meta';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2ac5426c-39 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-sheet/src/skills/index.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.85. The likeliest place is lines 1-6 (`export * as SheetSkill from './SheetSkill.ts';`, location confidence 1.00). Judged with added `importers` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0471a3a979aadf9d9acdab5d0d7d1756eb79e7c4`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 39 violations written to fragments, 370 uncertain, 1328 clean, 0 unanswered
- left for an agentic reviewer: 94 batch(es)

```text
requests: 707 (204 verdicts re-asked with context the model requested)
estimated input tokens: 7201153
billed input tokens: 6709812 (cost $0.2818)
measured chars per token: 3.22
```
