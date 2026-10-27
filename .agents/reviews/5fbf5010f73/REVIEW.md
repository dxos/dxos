---
branch: claude/agent-delegation-interface-ad8684
commit: 5fbf5010f73fdc03c2545e9ac6443691606a44cc
base: fbc0791aa40adab639e2b27cd12c106e4298f26c
mode: fast
createdAt: 2026-10-05T13:08:53.211Z
isFinalized: true
groups: 281
rules: [comment-hygiene, errors-extend-base-error, extract-non-rendering-logic-from-component, namespace-brand-key-prefixing, namespace-export-with-internal-hiding, no-casts, no-sleep-in-test, no-styling-wrapper-divs, options-object-with-defaults, setter-must-not-own-transaction, story-for-new-ui-component, structural-regions-use-design-system-components, test-real-scenario-not-narrower-proxy, use-context-scoped-cancellation]
reviewId: 5fbf5010f73
---

_2 error(s), 19 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 5fbf5010f73-1 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:124
- 5fbf5010f73-2 - ignored - no-styling-wrapper-divs - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:427
- 5fbf5010f73-3 - ignored - comment-hygiene - packages/plugins/plugin-assistant/src/plugin.ts:48
- 5fbf5010f73-4 - resolved - no-sleep-in-test - packages/plugins/plugin-code/src/agent-helper/McpBridge.test.ts:38
- 5fbf5010f73-5 - ignored - use-context-scoped-cancellation - packages/plugins/plugin-code/src/agent-helper/McpBridge.ts:66
- 5fbf5010f73-6 - resolved - errors-extend-base-error - packages/plugins/plugin-code/src/agent-helper/Worktrees.ts:19
- 5fbf5010f73-7 - ignored - options-object-with-defaults - packages/plugins/plugin-code/src/agent-helper/Worktrees.ts:58
- 5fbf5010f73-8 - ignored - test-real-scenario-not-narrower-proxy - packages/plugins/plugin-code/src/agents/AcpAgent.test.ts:46
- 5fbf5010f73-9 - resolved - no-sleep-in-test - packages/plugins/plugin-code/src/agents/AcpAgent.test.ts:81
- 5fbf5010f73-10 - resolved - no-sleep-in-test - packages/plugins/plugin-code/src/agents/McpRelay.test.ts:50
- 5fbf5010f73-11 - ignored - namespace-brand-key-prefixing - packages/plugins/plugin-code/src/agents/Projection.ts:1
- 5fbf5010f73-12 - resolved - namespace-brand-key-prefixing - packages/plugins/plugin-code/src/agents/Workspace.ts:35
- 5fbf5010f73-13 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-code/src/agents/Workspace.ts:57
- 5fbf5010f73-14 - ignored - no-casts - packages/plugins/plugin-code/src/containers/index.ts:1
- 5fbf5010f73-15 - ignored - setter-must-not-own-transaction - packages/plugins/plugin-code/src/containers/ProjectFolder/ProjectFolder.tsx:24
- 5fbf5010f73-16 - resolved - no-styling-wrapper-divs - packages/plugins/plugin-code/src/containers/ProjectFolder/ProjectFolder.tsx:48
- 5fbf5010f73-17 - ignored - namespace-export-with-internal-hiding - packages/plugins/plugin-code/src/index.ts:1
- 5fbf5010f73-18 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122
- 5fbf5010f73-19 - resolved - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/widgets/RequestWidget.tsx:24
- 5fbf5010f73-20 - resolved - structural-regions-use-design-system-components - packages/ui/react-ui-assistant/src/widgets/RequestWidget.tsx:24
- 5fbf5010f73-21 - ignored - story-for-new-ui-component - packages/ui/react-ui-assistant/src/widgets/RequestWidget.tsx:24

## Issues

# WARN 5fbf5010f73-1 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:124`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 124-147 (`const feedMessages = useQuery(`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-2 no-styling-wrapper-divs `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:427`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 427-448 (`const ChatContent = composable<HTMLDivElement, ChatContentProps>(({ children,...`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-3 comment-hygiene `packages/plugins/plugin-assistant/src/plugin.ts:48`

System One judges this a likely violation of `comment-hygiene` (Comments state settled reasoning, not noise), p=0.84. The likeliest place is lines 48-59 (`Plugin.addModule(AssistantState),`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-4 no-sleep-in-test `packages/plugins/plugin-code/src/agent-helper/McpBridge.test.ts:38`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 38-49 (`});`, location confidence 0.63). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-5 use-context-scoped-cancellation `packages/plugins/plugin-code/src/agent-helper/McpBridge.ts:66`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.81. The likeliest place is lines 66-77 (`}`, location confidence 0.82). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5fbf5010f73-6 errors-extend-base-error `packages/plugins/plugin-code/src/agent-helper/Worktrees.ts:19`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.93. The likeliest place is lines 19-30 (`export class WorktreeError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-7 options-object-with-defaults `packages/plugins/plugin-code/src/agent-helper/Worktrees.ts:58`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.82. The likeliest place is lines 58-69 (`export const ensure = async (`, location confidence 0.71). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-8 test-real-scenario-not-narrower-proxy `packages/plugins/plugin-code/src/agents/AcpAgent.test.ts:46`

System One judges this a likely violation of `test-real-scenario-not-narrower-proxy` (A test claiming end-to-end coverage must drive the real production path), p=0.80. The likeliest place is lines 46-59 (`const setup = Effect.fn(function* () {`, location confidence 0.55). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-9 no-sleep-in-test `packages/plugins/plugin-code/src/agents/AcpAgent.test.ts:81`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.94. The likeliest place is lines 81-87 (`const promptRecorded = (feed: Feed.Feed, text: string) =>`, location confidence 0.61). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-10 no-sleep-in-test `packages/plugins/plugin-code/src/agents/McpRelay.test.ts:50`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.90. The likeliest place is lines 50-62 (`body: { jsonrpc: '2.0', id: 1, method: 'ping' },`, location confidence 0.92). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-11 namespace-brand-key-prefixing `packages/plugins/plugin-code/src/agents/Projection.ts:1`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.90. The likeliest place is lines 1-17 (`import type * as acp from '@agentclientprotocol/sdk';`, location confidence 0.47). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-12 namespace-brand-key-prefixing `packages/plugins/plugin-code/src/agents/Workspace.ts:35`

System One judges this a likely violation of `namespace-brand-key-prefixing` (Namespace a brand or annotation key string with its owning module's path), p=0.84. The likeliest place is lines 35-41 (`const BRANCH_KEY = 'git-branch';`, location confidence 0.99). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-13 setter-must-not-own-transaction `packages/plugins/plugin-code/src/agents/Workspace.ts:57`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.83. The likeliest place is lines 57-64 (`export const recordBranch = (chat: Chat.Chat, branch: string): void => {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 5fbf5010f73-14 no-casts `packages/plugins/plugin-code/src/containers/index.ts:1`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.85. The likeliest place is lines 1-11 (`import { type ComponentType, lazy } from 'react';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-15 setter-must-not-own-transaction `packages/plugins/plugin-code/src/containers/ProjectFolder/ProjectFolder.tsx:24`

System One judges this a likely violation of `setter-must-not-own-transaction` (A low-level setter must not open its own batched-update transaction), p=0.85. The likeliest place is lines 24-35 (`export const ProjectFolder = ({ project }: ProjectFolderProps) => {`, location confidence 0.84). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-16 no-styling-wrapper-divs `packages/plugins/plugin-code/src/containers/ProjectFolder/ProjectFolder.tsx:48`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 48-59 (`}, [folder, setFolder]);`, location confidence 0.94). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-17 namespace-export-with-internal-hiding `packages/plugins/plugin-code/src/index.ts:1`

System One judges this a likely violation of `namespace-export-with-internal-hiding` (A package barrel exports explicitly, never by wildcard), p=0.84. The likeliest place is lines 1-10 (`export * from './agents/index.ts';`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-18 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.86. The likeliest place is lines 122-133 (`useEffect(() => {`, location confidence 0.93). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-19 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/widgets/RequestWidget.tsx:24`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.95. The likeliest place is lines 24-35 (`export const RequestWidget = ({ children, message }: RequestWidgetProps) => {`, location confidence 0.68). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-20 structural-regions-use-design-system-components `packages/ui/react-ui-assistant/src/widgets/RequestWidget.tsx:24`

System One judges this a likely violation of `structural-regions-use-design-system-components` (Dialog and card headers come from design-system parts, never ad hoc divs), p=0.80. The likeliest place is lines 24-35 (`export const RequestWidget = ({ children, message }: RequestWidgetProps) => {`, location confidence 0.37). This is a single-shot classifier: confirm against the rule before acting.

# WARN 5fbf5010f73-21 story-for-new-ui-component `packages/ui/react-ui-assistant/src/widgets/RequestWidget.tsx:24`

System One judges this a likely violation of `story-for-new-ui-component` (A new container or component ships with a Storybook story at the right level), p=0.89. The likeliest place is lines 24-35 (`export const RequestWidget = ({ children, message }: RequestWidgetProps) => {`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `fbc0791aa40adab639e2b27cd12c106e4298f26c`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 21 violations written to fragments, 426 uncertain, 2639 clean, 0 unanswered
- left for an agentic reviewer: 83 batch(es)

```text
requests: 1305 (293 verdicts re-asked with context the model requested)
estimated input tokens: 8813471
billed input tokens: 8110807 (cost $0.3407)
measured chars per token: 3.26
```
