---
branch: claude/agent-prompt-date-1bfbe7
commit: be2fb89405c509ab4dbde179ca10b1fae278b81f
base: 4a7f70b028960f8b2a449bfe1c98578636db52ea
mode: fast
createdAt: 2026-11-19T22:31:12.818Z
isFinalized: true
groups: 85
rules: [declare-optional-services-with-noop-layers, flat-layer-composition, no-casts, workaround-is-documented-and-removable]
reviewId: be2fb89405
---

_1 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- be2fb89405-1 - ignored - workaround-is-documented-and-removable - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.test.ts:25
- be2fb89405-2 - ignored - flat-layer-composition - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.test.ts:405
- be2fb89405-3 - ignored - no-casts - packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:484
- be2fb89405-4 - ignored - flat-layer-composition - packages/core/compute/assistant/src/request/format.test.ts:23
- be2fb89405-5 - ignored - declare-optional-services-with-noop-layers - packages/core/compute/assistant/src/request/format.ts:182

## Issues

# WARN be2fb89405-1 workaround-is-documented-and-removable `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.test.ts:25`

System One judges this a likely violation of `workaround-is-documented-and-removable` (A workaround names its proper fix, its owner, and when it can be deleted), p=0.83. The likeliest place is lines 25-28 (`// Workaround: @effect/ai-anthropic v0.26.0 declares AnthropicWebSearch with`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN be2fb89405-2 flat-layer-composition `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.test.ts:405`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.84. The likeliest place is lines 405-416 (`Layer.mergeAll(`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# ERROR be2fb89405-3 no-casts `packages/core/compute/ai/src/testing/model-fixture/LanguageModelFixture.ts:484`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 484-507 (`params.prompt,`, location confidence 0.52). This is a single-shot classifier: confirm against the rule before acting.

# WARN be2fb89405-4 flat-layer-composition `packages/core/compute/assistant/src/request/format.test.ts:23`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 23-29 (`const testLayer = () =>`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN be2fb89405-5 declare-optional-services-with-noop-layers `packages/core/compute/assistant/src/request/format.ts:182`

System One judges this a likely violation of `declare-optional-services-with-noop-layers` (An optional service is a declared requirement plus a noop layer, never a callback), p=0.83. The likeliest place is lines 182-193 (`const artifactDiffResolver = yield* Effect.serviceOption(ArtifactDiffResolver);`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `4a7f70b028960f8b2a449bfe1c98578636db52ea`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 182 uncertain, 128 clean, 0 unanswered
- left for an agentic reviewer: 65 batch(es)

```text
requests: 166 (124 verdicts re-asked with context the model requested)
estimated input tokens: 1868033
billed input tokens: 1777564 (cost $0.0747)
measured chars per token: 3.15
```

### Dismissals

All five findings point at lines this PR does not change (`git blame origin/main..HEAD` attributes none of them to its commits): an existing workaround comment and layer stack in `LanguageModelFixture.test.ts`, existing casts in `LanguageModelFixture.ts` `make`, the existing `testLayer` in `format.test.ts`, and the existing `ArtifactDiffResolver` lookup in `format.ts`. They are out of scope here, so each is `ignored`.
