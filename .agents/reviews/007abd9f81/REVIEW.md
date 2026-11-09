---
branch: HEAD
commit: 007abd9f8147a386d8677b8bf2a29d48465214da
base: c9a38c16b91475ffc810fa6a7b8f4bdec8c5e4b9
mode: fast
createdAt: 2026-11-09T19:26:12.772Z
isFinalized: true
groups: 137
rules: [call-effect-api-not-promise-bridge, code-not-in-strings, declare-optional-services-with-noop-layers, errors-extend-base-error, no-casts, no-try-catch-in-effect-code, per-test-mutable-fixtures, test-real-scenario-not-narrower-proxy]
reviewId: 007abd9f81
---

_2 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 007abd9f81-1 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/code-mode.test.ts:39
- 007abd9f81-2 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/code-mode.test.ts:184
- 007abd9f81-3 - ignored - call-effect-api-not-promise-bridge - packages/core/compute/agent-code-mode/src/code-mode.test.ts:588
- 007abd9f81-4 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:29
- 007abd9f81-5 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:106
- 007abd9f81-6 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/eval-tool.ts:262
- 007abd9f81-7 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-code-mode/src/producer.test.ts:72
- 007abd9f81-8 - resolved - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/producer.test.ts:90
- 007abd9f81-9 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:106
- 007abd9f81-10 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/producer.ts:288
- 007abd9f81-11 - resolved - no-try-catch-in-effect-code - packages/core/compute/assistant-toolkit/src/skills/skill-manager/operations/catalog.ts:95

## Issues

# WARN 007abd9f81-1 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/code-mode.test.ts:39`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.87. The likeliest place is lines 39-49 (`class Task extends Type.makeObject<Task>(DXN.make(TASK_TYPENAME, '0.1.0'))(`, location confidence 0.50). This is a single-shot classifier: confirm against the rule before acting.

# WARN 007abd9f81-2 code-not-in-strings `packages/core/compute/agent-code-mode/src/code-mode.test.ts:184`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.86. The likeliest place is lines 184-195 (`const tasks = await query('${TASK_TYPENAME}', { status: 'open' });`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 007abd9f81-3 call-effect-api-not-promise-bridge `packages/core/compute/agent-code-mode/src/code-mode.test.ts:588`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.90. The likeliest place is lines 588-599 (`'promise',`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 007abd9f81-4 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:29`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.92. The likeliest place is lines 29-40 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 007abd9f81-5 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:106`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.88. The likeliest place is lines 106-117 (`);`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 007abd9f81-6 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/eval-tool.ts:262`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.90. The likeliest place is lines 262-272 (`const evalCode = (input: string): string => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 007abd9f81-7 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-code-mode/src/producer.test.ts:72`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.82. The likeliest place is lines 72-83 (`AssistantTestLayer({`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN 007abd9f81-8 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/producer.test.ts:90`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.86. The likeliest place is lines 90-97 (`class Ticket extends Type.makeObject<Ticket>(DXN.make('com.example.type.ticke...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 007abd9f81-9 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:106`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.81. The likeliest place is lines 106-117 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 007abd9f81-10 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/producer.ts:288`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.93. The likeliest place is lines 288-300 (`const operationBehind = (tool: Tool.Any): Operation.Definition.Any | undefine...`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 007abd9f81-11 no-try-catch-in-effect-code `packages/core/compute/assistant-toolkit/src/skills/skill-manager/operations/catalog.ts:95`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.92. The likeliest place is lines 95-103 (`export const withInput = ({ listed, record }: OperationCandidate): ListedOper...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `c9a38c16b91475ffc810fa6a7b8f4bdec8c5e4b9`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 11 violations written to fragments, 449 uncertain, 405 clean, 0 unanswered
- left for an agentic reviewer: 86 batch(es)

```text
requests: 524 (279 verdicts re-asked with context the model requested)
estimated input tokens: 3740835
billed input tokens: 3513728 (cost $0.1476)
measured chars per token: 3.19
```
