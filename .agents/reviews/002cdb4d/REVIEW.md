---
branch: dm/intelligent-brown-85hhkh
commit: 002cdb4d9a62665fa944641de06682164619c99e
base: 0ebb028f31bba2f9a6cb88f0bfe42848467262fa
mode: fast
createdAt: 2026-10-25T16:42:59.750Z
isFinalized: true
groups: 77
rules: [import-as-namespace-is-all-or-nothing, keep-parallel-apis-structurally-aligned, no-bare-ref-schema-alias]
reviewId: 002cdb4d
---

_0 error(s), 3 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 002cdb4d-1 - ignored - keep-parallel-apis-structurally-aligned - packages/plugins/plugin-discord/src/operations/agent/attachments.ts:17
- 002cdb4d-2 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:13
- 002cdb4d-3 - ignored - no-bare-ref-schema-alias - packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:13

## Issues

# WARN 002cdb4d-1 keep-parallel-apis-structurally-aligned `packages/plugins/plugin-discord/src/operations/agent/attachments.ts:17`

System One judges this a likely violation of `keep-parallel-apis-structurally-aligned` (Give parallel modules and methods the same signature shape), p=0.80. The likeliest place is lines 17-28 (`export const resolveAttachments = Effect.fnUntraced(function* (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 002cdb4d-2 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:13`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.84. The likeliest place is lines 13-22 (`import * as DiscordBot from './DiscordBot.ts';`, location confidence 0.53). This is a single-shot classifier: confirm against the rule before acting.

# WARN 002cdb4d-3 no-bare-ref-schema-alias `packages/plugins/plugin-discord/src/types/DiscordAgentOperation.ts:13`

System One judges this a likely violation of `no-bare-ref-schema-alias` (Declare a Ref field inline, not through a module-level alias), p=0.92. The likeliest place is lines 13-22 (`import * as DiscordBot from './DiscordBot.ts';`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `0ebb028f31bba2f9a6cb88f0bfe42848467262fa`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 3 violations written to fragments, 110 uncertain, 190 clean, 0 unanswered
- left for an agentic reviewer: 45 batch(es)

```text
requests: 180 (72 verdicts re-asked with context the model requested)
estimated input tokens: 695239
billed input tokens: 640639 (cost $0.0269)
measured chars per token: 3.26
```
