---
branch: claude/ai-service-mock-storybook-90afd6
commit: 85d3b3894f58bc6ad9bec5f698803d1375d9c343
base: b70909be74ea682e03cc3529bc17a081614c421b
mode: fast
createdAt: 2026-09-28T09:21:34.387Z
isFinalized: true
groups: 110
rules: [effect-fn-not-hand-wrapped-gen, errors-extend-base-error, extract-non-rendering-logic-from-component, flat-layer-composition, no-casts, no-styling-wrapper-divs]
reviewId: 85d3b3894f
---

_3 error(s), 6 warning(s)._

# WARN 85d3b3894f-1 flat-layer-composition `packages/core/compute/agent-runtime/src/agent-service/AgentService.test.ts:168`

System One judges this a likely violation of `flat-layer-composition` (Compose Effect layers flatly, as module-level values, with a single provide), p=0.82. The likeliest place is lines 168-184 (`const assistantTestLayerOptions = {`, location confidence 0.42). This is a single-shot classifier: confirm against the rule before acting.

# WARN 85d3b3894f-2 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant-toolkit/src/types/Chat.test.ts:372`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.80. The likeliest place is lines 372-383 (`const readFeed = (feed: Feed.Feed) =>`, location confidence 0.74). This is a single-shot classifier: confirm against the rule before acting.

# WARN 85d3b3894f-3 effect-fn-not-hand-wrapped-gen `packages/core/compute/assistant/src/types/Chat.ts:265`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.87. The likeliest place is lines 265-274 (`export const loadTasks = (chat: Chat): Effect.Effect<Task.Task[], never, Data...`, location confidence 0.40). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 85d3b3894f-4 errors-extend-base-error `packages/plugins/plugin-assistant/src/processor/processor.ts:105`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.96. The likeliest place is lines 105-131 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 85d3b3894f-5 extract-non-rendering-logic-from-component `packages/plugins/plugin-projects/src/containers/ProjectArticle/ProjectArticle.tsx:122`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.87. The likeliest place is lines 122-133 (`useEffect(() => {`, location confidence 0.95). This is a single-shot classifier: confirm against the rule before acting.

# WARN 85d3b3894f-6 no-styling-wrapper-divs `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:269`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.88. The likeliest place is lines 269-292 (`const subject = (`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 85d3b3894f-7 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.stories.tsx:658`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.96. The likeliest place is lines 658-681 (`row(last.id)!.focus();`, location confidence 0.46). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 85d3b3894f-8 no-casts `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:340`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 340-357 (`export const Tree = <T extends { id: string } = any>({`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# WARN 85d3b3894f-9 extract-non-rendering-logic-from-component `packages/ui/react-ui-list/src/components/Tree/Tree.tsx:574`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.81. The likeliest place is lines 574-597 (`: undefined;`, location confidence 0.25). This is a single-shot classifier: confirm against the rule before acting.
