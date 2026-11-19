---
branch: HEAD
commit: f8bace44ece04eb259c72481d896eedcdc080b07
base: c63706215b0d57dde34e968a521749b11720152b
mode: fast
createdAt: 2026-11-10T17:10:01.347Z
isFinalized: true
groups: 91
rules: [code-not-in-strings, errors-extend-base-error, no-casts, no-sleep-in-test, no-try-catch-in-effect-code, test-real-scenario-not-narrower-proxy]
reviewId: f8bace44ec
---

_3 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- f8bace44ec-1 - ignored - errors-extend-base-error - packages/core/compute/agent-code-mode/src/dialect-plain.ts:29
- f8bace44ec-2 - ignored - no-casts - packages/core/compute/agent-code-mode/src/dialect-plain.ts:106
- f8bace44ec-3 - ignored - no-try-catch-in-effect-code - packages/core/compute/agent-code-mode/src/eval-tool.ts:262
- f8bace44ec-4 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-code-mode/src/producer.test.ts:72
- f8bace44ec-5 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerdSandbox.ts:181
- f8bace44ec-6 - ignored - no-casts - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:121
- f8bace44ec-7 - ignored - code-not-in-strings - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:168
- f8bace44ec-8 - ignored - no-sleep-in-test - packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:348

## Issues

# ERROR f8bace44ec-1 errors-extend-base-error `packages/core/compute/agent-code-mode/src/dialect-plain.ts:29`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.93. The likeliest place is lines 29-40 (`export class UnknownObjectTypeError extends Schema.TaggedError<UnknownObjectT...`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f8bace44ec-2 no-casts `packages/core/compute/agent-code-mode/src/dialect-plain.ts:106`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.84. The likeliest place is lines 106-117 (`);`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN f8bace44ec-3 no-try-catch-in-effect-code `packages/core/compute/agent-code-mode/src/eval-tool.ts:262`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.91. The likeliest place is lines 262-272 (`const evalCode = (input: string): string => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN f8bace44ec-4 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-code-mode/src/producer.test.ts:72`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 72-83 (`AssistantTestLayer({`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN f8bace44ec-5 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerdSandbox.ts:181`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.86. The likeliest place is lines 181-188 (`const modules = (code: string): Record<string, { js: string }> => ({`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR f8bace44ec-6 no-casts `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:121`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 121-132 (`const setup = () => {`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN f8bace44ec-7 code-not-in-strings `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:168`

System One judges this a likely violation of `code-not-in-strings` (Keep shipped or executed code in a real file, not a template string), p=0.88. The likeliest place is lines 168-179 (`const { rows, run } = setup();`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN f8bace44ec-8 no-sleep-in-test `packages/core/compute/agent-code-mode/src/WorkerdSandbox.workerd.test.ts:348`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.88. The likeliest place is lines 348-359 (``);`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `c63706215b0d57dde34e968a521749b11720152b`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 191 uncertain, 148 clean, 0 unanswered
- left for an agentic reviewer: 73 batch(es)

```text
requests: 199 (112 verdicts re-asked with context the model requested)
estimated input tokens: 1674287
billed input tokens: 1576621 (cost $0.0662)
measured chars per token: 3.19
```
