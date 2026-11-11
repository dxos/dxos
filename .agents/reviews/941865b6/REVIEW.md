---
branch: dm/default-file-storage
commit: 941865b6777eac759faae29d1fe77fcb1d6b9cbe
base: 524906089ef496b70bf7b8012df48a700816940a
mode: fast
createdAt: 2026-11-11T16:39:11.450Z
isFinalized: true
groups: 88
rules: [barrel-imports-not-internal-paths, canonical-api-surface, no-casts, no-try-catch-in-effect-code]
reviewId: 941865b6
---

_1 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 941865b6-1 - ignored - barrel-imports-not-internal-paths - packages/core/compute/compute-runtime/src/protocol.ts:1
- 941865b6-2 - ignored - canonical-api-surface - packages/core/compute/compute-runtime/src/protocol.ts:13
- 941865b6-3 - ignored - no-try-catch-in-effect-code - packages/core/compute/compute-runtime/src/protocol.ts:162
- 941865b6-4 - ignored - no-casts - packages/core/compute/compute-runtime/src/protocol.ts:174
- 941865b6-5 - ignored - no-try-catch-in-effect-code - packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:195

## Issues

# WARN 941865b6-1 barrel-imports-not-internal-paths `packages/core/compute/compute-runtime/src/protocol.ts:1`

System One judges this a likely violation of `barrel-imports-not-internal-paths` (Import from a directory's barrel, not a file inside it), p=0.80. The likeliest place is lines 1-12 (`import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';`, location confidence 0.47). Judged with added `imports, public-api` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 941865b6-2 canonical-api-surface `packages/core/compute/compute-runtime/src/protocol.ts:13`

System One judges this a likely violation of `canonical-api-surface` (Import the canonical public export, never an internal path), p=0.82. The likeliest place is lines 13-24 (`import { AiModelResolver, AiService, OpaqueToolkit } from '@dxos/ai';`, location confidence 0.60). Judged with added `imports, public-api, similar` context after a first pass of 0.75. This is a single-shot classifier: confirm against the rule before acting.

# WARN 941865b6-3 no-try-catch-in-effect-code `packages/core/compute/compute-runtime/src/protocol.ts:162`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 162-173 (`onExcessProperty: 'error',`, location confidence 0.35). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 941865b6-4 no-casts `packages/core/compute/compute-runtime/src/protocol.ts:174`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 174-185 (`const returned: any = await func.handler(dataWithDecodedRefs);`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 941865b6-5 no-try-catch-in-effect-code `packages/core/compute/plugin-host-cloudflare/src/PluginHost.ts:195`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.81. The likeliest place is lines 195-206 (`try {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `524906089ef496b70bf7b8012df48a700816940a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 5 violations written to fragments, 156 uncertain, 158 clean, 0 unanswered
- left for an agentic reviewer: 64 batch(es)

```text
requests: 191 (86 verdicts re-asked with context the model requested)
estimated input tokens: 1498033
billed input tokens: 1427937 (cost $0.0600)
measured chars per token: 3.15
```
