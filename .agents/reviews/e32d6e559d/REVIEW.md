---
branch: claude/agent-prompt-date-1bfbe7
commit: e32d6e559d445934abb2a771123aacab37be38a0
base: 4a7f70b028960f8b2a449bfe1c98578636db52ea
mode: fast
createdAt: 2026-11-20T14:39:05.293Z
isFinalized: true
groups: 91
rules: [declare-optional-services-with-noop-layers, error-messages-carry-context, flat-layer-composition, no-casts, options-object-with-defaults, test-real-scenario-not-narrower-proxy, workaround-is-documented-and-removable]
reviewId: e32d6e559d
---

_1 error(s), 7 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- e32d6e559d-1 - ignored - test-real-scenario-not-narrower-proxy - packages/core/compute/agent-code-mode/src/producer.test.ts:73
- e32d6e559d-2 - ignored - workaround-is-documented-and-removable - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.test.ts:25
- e32d6e559d-3 - ignored - flat-layer-composition - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.test.ts:51
- e32d6e559d-4 - ignored - no-casts - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:504
- e32d6e559d-5 - ignored - error-messages-carry-context - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:1002
- e32d6e559d-6 - ignored - flat-layer-composition - packages/core/compute/assistant/src/request/format.test.ts:23
- e32d6e559d-7 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/request/format.ts:182
- e32d6e559d-8 - ignored - options-object-with-defaults - packages/core/compute/assistant/src/templates/system.ts:18

## Issues

# WARN e32d6e559d-1 test-real-scenario-not-narrower-proxy `packages/core/compute/agent-code-mode/src/producer.test.ts:73`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 73-84 (`AssistantTestLayer({`, location confidence 0.60). Judged with added `imports, test` context after a first pass of 0.78. This is a single-shot classifier: confirm against the rule before acting.

# WARN e32d6e559d-2 workaround-is-documented-and-removable `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.test.ts:25`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.83. The likeliest place is lines 25-28 (`// Workaround: @effect/ai-anthropic v0.26.0 declares AnthropicWebSearch with`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN e32d6e559d-3 flat-layer-composition `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.test.ts:51`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.85. The likeliest place is lines 51-56 (`const TestLayer = Layer.mergeAll(`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# ERROR e32d6e559d-4 no-casts `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:504`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.93. The likeliest place is lines 504-527 (`params.prompt,`, location confidence 0.56). This is a single-shot classifier: confirm against the rule before acting.

# WARN e32d6e559d-5 error-messages-carry-context `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:1002`

System One judges this a likely violation of `error-messages-carry-context` (An error carries the identifier that lets it be traced), p=0.82. The likeliest place is lines 1002-1010 (`const error = (patch?: string) =>`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

# WARN e32d6e559d-6 flat-layer-composition `packages/core/compute/assistant/src/request/format.test.ts:23`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 23-29 (`const testLayer = () =>`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN e32d6e559d-7 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/request/format.ts:182`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.84. The likeliest place is lines 182-193 (`const artifactDiffResolver = yield* Effect.serviceOption(ArtifactDiffResolver);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN e32d6e559d-8 options-object-with-defaults `packages/core/compute/assistant/src/templates/system.ts:18`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.85. The likeliest place is lines 18-23 (`export type SystemPromptOptions = Model.Capabilities;`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4a7f70b028960f8b2a449bfe1c98578636db52ea`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 8 violations written to fragments, 200 uncertain, 152 clean, 0 unanswered
- left for an agentic reviewer: 69 batch(es)

```text
requests: 199 (135 verdicts re-asked with context the model requested)
estimated input tokens: 2021603
billed input tokens: 1950634 (cost $0.0819)
measured chars per token: 3.11
```

### Dismissals

- e32d6e559d-1, -2, -3, -4, -5, -6, -7: the lines they point at are not changed by this PR (`git blame origin/main..HEAD` attributes none of them to its commits), so they are out of scope.
- e32d6e559d-8: a false positive. `createSystemPrompt` already takes one defaulted options object (`options: Partial<SystemPromptOptions> = {}`); this PR only drops the `DATETIME` field from it.
