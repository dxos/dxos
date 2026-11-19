---
branch: claude/agent-code-mode-ops-types
commit: 9d9b8cee270cec6932bbcc2b68c6f3b90fcb2e04
base: 6cd526c4ebfb765f665818c2a5dd65121fb65bc7
mode: fast
createdAt: 2026-11-19T01:26:28.348Z
isFinalized: true
groups: 77
rules: [call-effect-api-not-promise-bridge, code-not-in-strings, declare-optional-services-with-noop-layers, errors-extend-base-error, no-casts, no-try-catch-in-effect-code, per-test-mutable-fixtures, test-real-scenario-not-narrower-proxy]
reviewId: 9d9b8cee27
---

_2 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 9d9b8cee27-1 - ignored - per-test-mutable-fixtures - packages/core/compute/agent-code-mode/src/code-mode.test.ts:95
- 9d9b8cee27-2 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/code-mode.test.ts:188
- 9d9b8cee27-3 - ignored - call-effect-api-not-promise-bridge - packages/core/compute/agent-code-mode/src/code-mode.test.ts:592
- 9d9b8cee27-4 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:29
- 9d9b8cee27-5 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:130
- 9d9b8cee27-6 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-code-mode/src/producer.test.ts:72
- 9d9b8cee27-7 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/agent-code-mode/src/producer.ts:107
- 9d9b8cee27-8 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/producer.ts:302

## Issues

# WARN 9d9b8cee27-1 per-test-mutable-fixtures `packages/core/compute/agent-code-mode/src/code-mode.test.ts:95`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.87. The likeliest place is lines 95-103 (`const TestLayer = AssistantTestLayer({`, location confidence 0.27). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9d9b8cee27-2 code-not-in-strings `packages/core/compute/agent-code-mode/src/code-mode.test.ts:188`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.87. The likeliest place is lines 188-199 (`const tasks = await query('${TASK_TYPENAME}', { status: 'open' });`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9d9b8cee27-3 call-effect-api-not-promise-bridge `packages/core/compute/agent-code-mode/src/code-mode.test.ts:592`

System One judges this a likely violation of `call-effect-api-not-promise-bridge` (Inside Effect code, call the Effect form of an API, never its Promise twin), p=0.89. The likeliest place is lines 592-603 (`'promise',`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9d9b8cee27-4 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:29`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.91. The likeliest place is lines 29-40 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 9d9b8cee27-5 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:130`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.83. The likeliest place is lines 130-141 (`),`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9d9b8cee27-6 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-code-mode/src/producer.test.ts:72`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 72-83 (`AssistantTestLayer({`, location confidence 0.64). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9d9b8cee27-7 declare-optional-services-with-noop-layers `packages/core/compute/agent-code-mode/src/producer.ts:107`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.80. The likeliest place is lines 107-118 (`options.sandbox ?? Option.getOrElse(yield* Effect.serviceOption(Sandbox.Servi...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 9d9b8cee27-8 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/producer.ts:302`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.92. The likeliest place is lines 302-314 (`const operationBehind = (tool: Tool.Any): Operation.Definition.Any | undefine...`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `6cd526c4ebfb765f665818c2a5dd65121fb65bc7`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 133 uncertain, 72 clean, 0 unanswered
- left for an agentic reviewer: 63 batch(es)

```text
requests: 117 (80 verdicts re-asked with context the model requested)
estimated input tokens: 1279347
billed input tokens: 1215964 (cost $0.0511)
measured chars per token: 3.16
```
