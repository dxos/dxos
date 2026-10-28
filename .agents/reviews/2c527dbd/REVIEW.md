---
branch: dm/quirky-carson-ougdwa
commit: 2c527dbdee65c8516260f2e869204032ab3412a3
base: 81d2cd2333c1f65a325fb6a30116602eb9779a73
mode: fast
createdAt: 2026-10-28T07:35:34.510Z
isFinalized: true
groups: 107
rules: [design-tokens-not-raw-spacing-sizing, event-handler-naming-convention, extract-non-rendering-logic-from-component, flat-layer-composition, import-as-namespace-is-all-or-nothing, no-mixed-promise-effect-lifecycle, no-styling-wrapper-divs, operations-resolve-database-from-service]
reviewId: 2c527dbd
---

_0 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 2c527dbd-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:158
- 2c527dbd-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:463
- 2c527dbd-3 - ignored - design-tokens-not-raw-spacing-sizing - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:824
- 2c527dbd-4 - ignored - event-handler-naming-convention - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:946
- 2c527dbd-5 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/extractor/extract-mailbox.test.ts:67
- 2c527dbd-6 - ignored - no-mixed-promise-effect-lifecycle - packages/plugins/plugin-inbox/src/operations/extractor/extract-mailbox.test.ts:91
- 2c527dbd-7 - ignored - flat-layer-composition - packages/plugins/plugin-inbox/src/operations/extractor/extract-message.test.ts:23
- 2c527dbd-8 - ignored - import-as-namespace-is-all-or-nothing - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:1
- 2c527dbd-9 - ignored - operations-resolve-database-from-service - packages/plugins/plugin-inbox/src/types/InboxOperation.ts:241

## Issues

# WARN 2c527dbd-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:158`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.82. The likeliest place is lines 158-181 (`useEffect(() => {`, location confidence 0.41). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2c527dbd-2 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:463`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 463-484 (`const ChatContent = Util.composable<HTMLDivElement, ChatContentProps>(({ chil...`, location confidence 0.73). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2c527dbd-3 design-tokens-not-raw-spacing-sizing `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:824`

System One judges this a likely violation of `design-tokens-not-raw-spacing-sizing` (Spacing and sizing come from the design system's tokens, not raw Tailwind or arbitrary values), p=0.81. The likeliest place is lines 824-847 (`}`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2c527dbd-4 event-handler-naming-convention `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:946`

System One judges this a likely violation of `event-handler-naming-convention` (Name callback props with the established on/handle + Noun + Verb pattern), p=0.80. The likeliest place is lines 946-969 (`const getTaskActions = useCallback(`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2c527dbd-5 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/extractor/extract-mailbox.test.ts:67`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 67-78 (`const runExtractMailbox = (`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2c527dbd-6 no-mixed-promise-effect-lifecycle `packages/plugins/plugin-inbox/src/operations/extractor/extract-mailbox.test.ts:91`

System One judges this a likely violation of `no-mixed-promise-effect-lifecycle` (Once an interface is Effect-based, keep its whole surface in Effect), p=0.83. The likeliest place is lines 91-96 (`schedule: () => Effect.void,`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2c527dbd-7 flat-layer-composition `packages/plugins/plugin-inbox/src/operations/extractor/extract-message.test.ts:23`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.81. The likeliest place is lines 23-34 (`const runExtractMessage = (`, location confidence 0.69). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2c527dbd-8 import-as-namespace-is-all-or-nothing `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:1`

System One judges this a likely violation of `import-as-namespace-is-all-or-nothing` (A namespace module's directive, filename, re-export and import sites must agree), p=0.80. The likeliest place is lines 1-22 (`import * as Schema from 'effect/Schema';`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 2c527dbd-9 operations-resolve-database-from-service `packages/plugins/plugin-inbox/src/types/InboxOperation.ts:241`

System One judges this a likely violation of `operations-resolve-database-from-service` (An operation never takes a database as input; it yields Database.Service), p=0.97. The likeliest place is lines 241-254 (`export const ExtractInputSchema = Schema.Struct({`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `81d2cd2333c1f65a325fb6a30116602eb9779a73`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 9 violations written to fragments, 288 uncertain, 206 clean, 0 unanswered
- left for an agentic reviewer: 91 batch(es)

```text
requests: 278 (168 verdicts re-asked with context the model requested)
estimated input tokens: 2826006
billed input tokens: 2710731 (cost $0.1139)
measured chars per token: 3.13
```
