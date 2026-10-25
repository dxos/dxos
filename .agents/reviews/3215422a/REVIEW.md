---
branch: dm/intelligent-brown-85hhkh
commit: 3215422a1a13ff032deb42b02ad945075d42be3e
base: 0ebb028f31bba2f9a6cb88f0bfe42848467262fa
mode: fast
createdAt: 2026-10-25T16:30:04.282Z
isFinalized: true
groups: 77
rules: [effect-fn-not-hand-wrapped-gen, import-as-namespace-is-all-or-nothing, keep-parallel-apis-structurally-aligned, no-bare-ref-schema-alias]
reviewId: 3215422a
---

_0 error(s), 4 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 3215422a-1 - resolved - effect-fn-not-hand-wrapped-gen - packages/plugins/plugin-discord/src/operations/agent/attachments.test.ts:20
- 3215422a-2 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-discord/src/operations/agent/attachments.ts:17
- 3215422a-3 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:13
- 3215422a-4 - resolved - no-bare-ref-schema-alias - packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:23

## Issues

# WARN 3215422a-1 effect-fn-not-hand-wrapped-gen `packages/plugins/plugin-discord/src/operations/agent/attachments.test.ts:20`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.85. The likeliest place is lines 20-27 (`const addFile = (name: string, blob: Parameters<typeof Blob.make>[0]) =>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3215422a-2 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-discord/src/operations/agent/attachments.ts:17`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.81. The likeliest place is lines 17-28 (`export const resolveAttachments = Effect.fnUntraced(function* (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3215422a-3 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 13-22 (`import * as DiscordBot from './DiscordBot.ts';`, location confidence 0.57). This is a single-shot classifier: confirm against the rule before acting.

# WARN 3215422a-4 no-bare-ref-schema-alias `packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:23`

System One judges this a likely violation of `no-bare-ref-schema-alias` (Declare a Ref field inline, not through a module-level alias), p=0.94. The likeliest place is lines 23-29 (`const files = Schema.optional(`, location confidence 0.39). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0ebb028f31bba2f9a6cb88f0bfe42848467262fa`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 4 violations written to fragments, 105 uncertain, 194 clean, 0 unanswered
- left for an agentic reviewer: 43 batch(es)

```text
requests: 181 (71 verdicts re-asked with context the model requested)
estimated input tokens: 678155
billed input tokens: 625088 (cost $0.0263)
measured chars per token: 3.25
```
