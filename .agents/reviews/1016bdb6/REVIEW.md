---
branch: HEAD
commit: 1016bdb67c362adbf11bb776049f963c07af3061
base: bb2b6723db1f3f3bf24241b5bdd04b47d97470bd
mode: fast
createdAt: 2026-10-05T09:00:39.686Z
isFinalized: true
groups: 148
rules: [errors-extend-base-error, extract-non-rendering-logic-from-component, namespace-export-with-internal-hiding, no-casts, no-env-vars-in-low-level-modules, no-sleep-in-test, no-styling-wrapper-divs, reactive-state-via-atom-bridge]
reviewId: 1016bdb6
---

_4 error(s), 12 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 1016bdb6-1 - unresolved - no-env-vars-in-low-level-modules - packages/e2e/perf-harness/src/report.ts:555
- 1016bdb6-2 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:122
- 1016bdb6-3 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:397
- 1016bdb6-4 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74
- 1016bdb6-5 - unresolved - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:211
- 1016bdb6-6 - unresolved - no-casts - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252
- 1016bdb6-7 - unresolved - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82
- 1016bdb6-8 - unresolved - no-sleep-in-test - packages/plugins/plugin-assistant/src/processor/outbox.test.ts:13
- 1016bdb6-9 - unresolved - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/outbox.ts:36
- 1016bdb6-10 - unresolved - errors-extend-base-error - packages/plugins/plugin-assistant/src/processor/processor.ts:114
- 1016bdb6-11 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:152
- 1016bdb6-12 - unresolved - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:330
- 1016bdb6-13 - unresolved - reactive-state-via-atom-bridge - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.tsx:122
- 1016bdb6-14 - unresolved - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:104
- 1016bdb6-15 - unresolved - namespace-export-with-internal-hiding - packages/ui/react-ui-assistant/src/index.ts:1
- 1016bdb6-16 - unresolved - extract-non-rendering-logic-from-component - packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:204

## Issues

# WARN 1016bdb6-1 no-env-vars-in-low-level-modules `packages/e2e/perf-harness/src/report.ts:555`

System One judges this a likely violation of `no-env-vars-in-low-level-modules` (A low-level module reads its config from constructor params, never the environment), p=0.80. The likeliest place is lines 555-566 (`export const publishPosthogBatch = (workspaceRoot: string, file: string): boo...`, location confidence 0.98). Judged with added `importers, package` context after a first pass of 0.77. This is a single-shot classifier: confirm against the rule before acting.

# WARN 1016bdb6-2 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 122-145 (`const feedMessages = useQuery(`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1016bdb6-3 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:397`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.94. The likeliest place is lines 397-429 (`>`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1016bdb6-4 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.stories.tsx:74`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.92. The likeliest place is lines 74-88 (`return (`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1016bdb6-5 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/ChatPrompt/ChatPrompt.tsx:211`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 211-222 (`<div className='flex p-2 gap-2'>`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1016bdb6-6 no-casts `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.stories.tsx:252`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.92. The likeliest place is lines 252-263 (`interval: 300,`, location confidence 0.49). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1016bdb6-7 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/containers/ChatArticle/ChatArticle.tsx:82`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.88. The likeliest place is lines 82-93 (`useEffect(() => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1016bdb6-8 no-sleep-in-test `packages/plugins/plugin-assistant/src/processor/outbox.test.ts:13`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.82. The likeliest place is lines 13-28 (`const createDispatch = () => {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1016bdb6-9 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/outbox.ts:36`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.97. The likeliest place is lines 36-48 (`export class PromptCancelledError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1016bdb6-10 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:114`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 114-134 (`export type ChatErrorAction = { readonly labelKey: string };`, location confidence 0.87). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1016bdb6-11 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:152`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 152-163 (`<Panel.Body classNames='flex flex-col'>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 1016bdb6-12 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:330`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 330-336 (`const type = (input: HTMLInputElement, value: string) => {`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1016bdb6-13 reactive-state-via-atom-bridge `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.tsx:122`

System One judges this a likely violation of `reactive-state-via-atom-bridge` (Reactively-observed state is backed by an atom through the established bridge, not a hand-rolled subscription), p=0.80. The likeliest place is lines 122-133 (`const [streaming, setStreaming] = useState(!!model.streamingId);`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1016bdb6-14 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:104`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 104-115 (`export const PromptToolbar = memo(({ classNames, message }: MessageToolbarPro...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1016bdb6-15 namespace-export-with-internal-hiding `packages/ui/react-ui-assistant/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.94. The likeliest place is lines 1-11 (`export * from './components/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 1016bdb6-16 extract-non-rendering-logic-from-component `packages/ui/react-ui-feed/src/components/Block/MarkdownBlock.tsx:204`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.84. The likeliest place is lines 204-215 (`if (!view || (!hits?.length && !highlighted.current)) {`, location confidence 0.19). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `bb2b6723db1f3f3bf24241b5bdd04b47d97470bd`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 16 violations written to fragments, 236 uncertain, 1090 clean, 0 unanswered
- left for an agentic reviewer: 63 batch(es)

```text
requests: 571 (137 verdicts re-asked with context the model requested)
estimated input tokens: 4592509
billed input tokens: 4320243 (cost $0.1815)
measured chars per token: 3.19
```
