---
branch: HEAD
commit: 17edc880bfb105921288161745b95364f9942b73
base: 392bed09f7876d35abf641e89ab2cd92464c9e15
mode: fast
createdAt: 2026-11-12T12:21:37.802Z
isFinalized: true
groups: 92
rules: [barrel-imports-not-internal-paths, canonical-api-surface, no-casts, no-try-catch-in-effect-code, use-context-scoped-cancellation]
reviewId: 17edc880
---

_1 error(s), 5 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 17edc880-1 - ignored - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:1
- 17edc880-2 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- 17edc880-3 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute-runtime/src/protocol.ts:167
- 17edc880-4 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:179
- 17edc880-5 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:208
- 17edc880-6 - ignored - use-context-scoped-cancellation - packages/core/compute/plugin-host-cloudflare/src/testing/TestPlugin.ts:92

## Issues

# WARN 17edc880-1 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.80. The likeliest place is lines 1-12 (`import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';`, location confidence 0.36). This is a single-shot classifier: confirm against the rule before acting.

# WARN 17edc880-2 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.84. The likeliest place is lines 13-24 (`import { AiModelResolver, AiService, OpaqueToolkit } from '@dxos/ai';`, location confidence 0.65). Judged with added `imports, public-api, similar` context after a first pass of 0.79. This is a single-shot classifier: confirm against the rule before acting.

# WARN 17edc880-3 no-try-catch-in-effect-code `packages/core/compute/compute-runtime/src/protocol.ts:167`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.88. The likeliest place is lines 167-178 (`onExcessProperty: 'error',`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 17edc880-4 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:179`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 179-190 (`const returned: any = await func.handler(dataWithDecodedRefs);`, location confidence 0.77). This is a single-shot classifier: confirm against the rule before acting.

# WARN 17edc880-5 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:208`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 208-216 (`} catch (error) {`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 17edc880-6 use-context-scoped-cancellation `packages/core/compute/plugin-host-cloudflare/src/testing/TestPlugin.ts:92`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.85. The likeliest place is lines 92-103 (`const InspectHandler = Inspect.pipe(`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `392bed09f7876d35abf641e89ab2cd92464c9e15`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 6 violations written to fragments, 140 uncertain, 66 clean, 0 unanswered
- left for an agentic reviewer: 71 batch(es)

```text
requests: 133 (79 verdicts re-asked with context the model requested)
estimated input tokens: 1440539
billed input tokens: 1407194 (cost $0.0591)
measured chars per token: 3.07
```
