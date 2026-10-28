---
branch: dm/quirky-carson-ougdwa
commit: 2bbe539ad429b9ce457acf2e9d7c92d6ae4f4bfd
base: 81d2cd2333c1f65a325fb6a30116602eb9779a73
mode: fast
createdAt: 2026-10-28T09:15:46.767Z
isFinalized: true
groups: 107
rules: [design-tokens-not-raw-spacing-sizing, extract-non-rendering-logic-from-component, flat-layer-composition, jsdoc-non-obvious-identifiers, no-mixed-promise-effect-lifecycle, no-styling-wrapper-divs, operations-resolve-database-from-service]
reviewId: 2bbe539a
---

_0 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2bbe539a-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:158
- 2bbe539a-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:463
- 2bbe539a-3 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:824
- 2bbe539a-4 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/extractor/extract-mailbox.test.ts:67
- 2bbe539a-5 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-inbox/src/operations/extractor/extract-mailbox.test.ts:91
- 2bbe539a-6 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/extractor/extract-message.test.ts:23
- 2bbe539a-7 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/extractor/extract-message.ts:91
- 2bbe539a-8 - ignored - jsdoc-non-obvious-identifiers - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:110
- 2bbe539a-9 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:241

## Issues

# WARN 2bbe539a-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:158`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 158-181 (`useEffect(() => {`, location confidence 0.45). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2bbe539a-2 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:463`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 463-484 (`const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ chil...`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2bbe539a-3 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:824`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 824-847 (`}`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2bbe539a-4 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/extractor/extract-mailbox.test.ts:67`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 67-78 (`const runExtractMailbox = (`, location confidence 0.59). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2bbe539a-5 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-inbox/src/operations/extractor/extract-mailbox.test.ts:91`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.82. The likeliest place is lines 91-96 (`schedule: () => Effect.void,`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2bbe539a-6 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/extractor/extract-message.test.ts:23`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 23-34 (`const runExtractMessage = (`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2bbe539a-7 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/extractor/extract-message.ts:91`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.80. The likeliest place is lines 91-102 (`Layer.provideMerge(InboxResolver.Live),`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2bbe539a-8 jsdoc-non-obvious-identifiers `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:110`

System One judges this a likely violation of `jsdoc-non-obvious-identifiers` (Document a parameter, field, or handle whose meaning isn't obvious from its name), p=0.82. The likeliest place is lines 110-135 (`export const DraftEmailAndOpen = Operation.make({`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2bbe539a-9 operations-resolve-database-from-service `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:241`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.97. The likeliest place is lines 241-254 (`export const ExtractInputSchema = Schema.Struct({`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `81d2cd2333c1f65a325fb6a30116602eb9779a73`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 293 uncertain, 202 clean, 0 unanswered
- left for an agentic reviewer: 92 batch(es)

```text
requests: 283 (172 verdicts re-asked with context the model requested)
estimated input tokens: 2932169
billed input tokens: 2804739 (cost $0.1178)
measured chars per token: 3.14
```
