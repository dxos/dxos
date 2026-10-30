---
branch: dm/quirky-carson-ougdwa
commit: 07559a92f6fc440d3ca5efeb65f0fb80d65474dc
base: a74339ed31c29adadac5bcd959c300572afa022f
mode: fast
createdAt: 2026-10-27T17:09:39.998Z
isFinalized: true
groups: 147
rules: [bounded-live-state, capability-module-layout, flat-layer-composition, jsdoc-non-obvious-identifiers, namespace-brand-key-prefixing, operations-resolve-database-from-service]
reviewId: 07559a92
---

_1 error(s), 6 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 07559a92-1 - ignored - flat-layer-composition - packages/plugins/plugin-assistant/src/capabilities/ai-service.ts:34
- 07559a92-2 - ignored - flat-layer-composition - packages/plugins/plugin-assistant/src/capabilities/edge-model-resolver.ts:33
- 07559a92-3 - ignored - capability-module-layout - packages/plugins/plugin-inbox/src/capabilities/mailbox-processors.ts:28
- 07559a92-4 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-inbox/src/operations/triage/constants.ts:12
- 07559a92-5 - resolved - bounded-live-state - packages/plugins/plugin-inbox/src/operations/triage/triage-mailbox.ts:197
- 07559a92-6 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:110
- 07559a92-7 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:241

## Issues

# WARN 07559a92-1 flat-layer-composition `packages/plugins/plugin-assistant/src/capabilities/ai-service.ts:34`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.87. The likeliest place is lines 34-45 (`const keylessResolver = ClairicResolver.make({`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

# WARN 07559a92-2 flat-layer-composition `packages/plugins/plugin-assistant/src/capabilities/edge-model-resolver.ts:33`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.88. The likeliest place is lines 33-44 (`const anthropicClient = AnthropicClient.layer({ apiUrl: EDGE_SENTINEL_URL })....`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 07559a92-3 capability-module-layout `packages/plugins/plugin-inbox/src/capabilities/mailbox-processors.ts:28`

System One judges this a likely violation of `capability-module-layout` (A capability is defined inline in its contribute call, in a module named after its directory), p=0.84. The likeliest place is lines 28-39 (`export const inboxMailboxProcessors: readonly InboxCapabilities.MailboxProces...`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 07559a92-4 namespace-brand-key-prefixing `packages/plugins/plugin-inbox/src/operations/triage/constants.ts:12`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.81. The likeliest place is lines 12-17 (`export const TriageTag = {`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 07559a92-5 bounded-live-state `packages/plugins/plugin-inbox/src/operations/triage/triage-mailbox.ts:197`

System One judges this a likely violation of `bounded-live-state` (Every collection of live entities has an explicit upper bound), p=0.82. The likeliest place is lines 197-208 (`const created = yield* Effect.forEach(tasks, (task) =>`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 07559a92-6 jsdoc-non-obvious-identifiers `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:110`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.80. The likeliest place is lines 110-135 (`export const DraftEmailAndOpen = Operation.make({`, location confidence 0.43). This is a single-shot classifier: confirm against the rule before acting.

# WARN 07559a92-7 operations-resolve-database-from-service `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:241`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.97. The likeliest place is lines 241-254 (`export const ExtractInputSchema = Schema.Struct({`, location confidence 0.48). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `a74339ed31c29adadac5bcd959c300572afa022f`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 7 violations written to fragments, 203 uncertain, 669 clean, 0 unanswered
- left for an agentic reviewer: 76 batch(es)

```text
requests: 383 (130 verdicts re-asked with context the model requested)
estimated input tokens: 2754622
billed input tokens: 2531508 (cost $0.1063)
measured chars per token: 3.26
```
