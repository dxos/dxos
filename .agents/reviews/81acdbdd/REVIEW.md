---
branch: dm/affectionate-mendel-9c78ph
commit: 81acdbdd1d5ecbc3dab5fcdc1d2dc903db5d083a
base: 3b37cd1b778f0d120710db075f2d33b93a51772a
mode: fast
createdAt: 2026-10-20T06:08:24.369Z
isFinalized: true
groups: 218
rules: [atom-lifetime-bound-to-owner, effect-fn-not-hand-wrapped-gen, errors-extend-base-error, extract-non-rendering-logic-from-component, no-casts, no-module-level-object-caches, no-sleep-in-test, no-styling-wrapper-divs, no-try-catch-in-effect-code, one-changeset-per-pr, per-test-mutable-fixtures, use-context-scoped-cancellation]
reviewId: 81acdbdd
---

_4 error(s), 12 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 81acdbdd-1 - ignored - one-changeset-per-pr - .changeset/chat-author-avatars.md:1
- 81acdbdd-2 - ignored - errors-extend-base-error - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:129
- 81acdbdd-3 - ignored - no-try-catch-in-effect-code - packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:528
- 81acdbdd-4 - ignored - per-test-mutable-fixtures - packages/plugins/plugin-assistant/src/chat-model/thread.test.ts:393
- 81acdbdd-5 - ignored - no-module-level-object-caches - packages/plugins/plugin-assistant/src/chat-model/thread.ts:216
- 81acdbdd-6 - ignored - extract-non-rendering-logic-from-component - packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120
- 81acdbdd-7 - ignored - no-casts - packages/sdk/client/src/client/client.ts:349
- 81acdbdd-8 - ignored - use-context-scoped-cancellation - packages/sdk/client/src/client/client.ts:613
- 81acdbdd-9 - ignored - no-sleep-in-test - packages/sdk/worker-framework/src/Client.test.ts:547
- 81acdbdd-10 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/Client.test.ts:686
- 81acdbdd-11 - ignored - no-casts - packages/sdk/worker-framework/src/Client.ts:467
- 81acdbdd-12 - ignored - use-context-scoped-cancellation - packages/sdk/worker-framework/src/Client.ts:611
- 81acdbdd-13 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:156
- 81acdbdd-14 - ignored - no-casts - packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:378
- 81acdbdd-15 - ignored - no-styling-wrapper-divs - packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:123
- 81acdbdd-16 - ignored - atom-lifetime-bound-to-owner - packages/ui/react-ui-canvas/src/engine/projections/dynamic.ts:159

## Issues

# WARN 81acdbdd-1 one-changeset-per-pr `.changeset/chat-author-avatars.md:1`

System One judges this a likely violation of `one-changeset-per-pr` (A PR carries at most one changeset, and none for a chore), p=0.96. This is a single-shot classifier: confirm against the rule before acting.

# ERROR 81acdbdd-2 errors-extend-base-error `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:129`

System One judges this a likely violation of `errors-extend-base-error` (Error classes are defined with `BaseError.extend`, never by subclassing `Error` or a tagged-error factory), p=0.95. The likeliest place is lines 129-155 (`export class AiUsageQuotaError extends Error {`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

# WARN 81acdbdd-3 no-try-catch-in-effect-code `packages/plugins/plugin-assistant/src/chat-model/chat-model.ts:528`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.85. The likeliest place is lines 528-551 (`} catch (err) {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 81acdbdd-4 per-test-mutable-fixtures `packages/plugins/plugin-assistant/src/chat-model/thread.test.ts:393`

System One judges this a likely violation of `per-test-mutable-fixtures` (Mutable test state is created per test; stateless layers stay module-level), p=0.83. The likeliest place is lines 393-409 (`describe('resolveRewind', () => {`, location confidence 0.90). This is a single-shot classifier: confirm against the rule before acting.

# WARN 81acdbdd-5 no-module-level-object-caches `packages/plugins/plugin-assistant/src/chat-model/thread.ts:216`

System One judges this a likely violation of `no-module-level-object-caches` (Scope a WeakMap cache or FinalizationRegistry to its owner, never the module), p=0.95. The likeliest place is lines 216-224 (`const deliveryRows = new WeakMap<`, location confidence 0.88). This is a single-shot classifier: confirm against the rule before acting.

# WARN 81acdbdd-6 extract-non-rendering-logic-from-component `packages/plugins/plugin-assistant/src/components/Chat/Chat.tsx:120`

System One judges this a likely violation of `extract-non-rendering-logic-from-component` (Move derived-state and lifecycle logic out of the component body into a hook or function), p=0.83. The likeliest place is lines 120-143 (`const [feedSnapshot] = useObject(chat?.feed);`, location confidence 0.33). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 81acdbdd-7 no-casts `packages/sdk/client/src/client/client.ts:349`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 349-372 (`const spaces = this.spaces.get();`, location confidence 0.75). This is a single-shot classifier: confirm against the rule before acting.

# WARN 81acdbdd-8 use-context-scoped-cancellation `packages/sdk/client/src/client/client.ts:613`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.86. The likeliest place is lines 613-636 (`this._statusStreamCleanup = subscribeStream(`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 81acdbdd-9 no-sleep-in-test `packages/sdk/worker-framework/src/Client.test.ts:547`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.96. The likeliest place is lines 547-570 (`await sleep(200);`, location confidence 0.62). This is a single-shot classifier: confirm against the rule before acting.

# WARN 81acdbdd-10 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/Client.test.ts:686`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 686-706 (`Effect.gen(function* () {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 81acdbdd-11 no-casts `packages/sdk/worker-framework/src/Client.ts:467`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 467-490 (`}`, location confidence 0.18). This is a single-shot classifier: confirm against the rule before acting.

# WARN 81acdbdd-12 use-context-scoped-cancellation `packages/sdk/worker-framework/src/Client.ts:611`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.82. The likeliest place is lines 611-634 (`this.#coordinator?.sendMessage({`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 81acdbdd-13 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:156`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.89. The likeliest place is lines 156-167 (`<Panel.Body classNames='flex flex-col'>`, location confidence 0.58). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 81acdbdd-14 no-casts `packages/ui/react-ui-assistant/src/components/ChatThread/ChatThread.stories.tsx:378`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.95. The likeliest place is lines 378-389 (`const input = canvasElement.querySelector<HTMLInputElement>('[data-testid="as...`, location confidence 0.32). This is a single-shot classifier: confirm against the rule before acting.

# WARN 81acdbdd-15 no-styling-wrapper-divs `packages/ui/react-ui-assistant/src/components/MessageChrome/MessageChrome.tsx:123`

System One judges this a likely violation of `no-styling-wrapper-divs` (Boxes come from Flex/Grid/Column/Container, not a hand-rolled `<div className='flex …'>`), p=0.93. The likeliest place is lines 123-134 (`export const PromptToolbar = memo(({ classNames, message }: MessageToolbarPro...`, location confidence 0.78). This is a single-shot classifier: confirm against the rule before acting.

# WARN 81acdbdd-16 atom-lifetime-bound-to-owner `packages/ui/react-ui-canvas/src/engine/projections/dynamic.ts:159`

System One judges this a likely violation of `atom-lifetime-bound-to-owner` (An atom lives exactly as long as its owner; never pin it with keepAlive or a side registry), p=0.87. The likeliest place is lines 159-170 (`export const createDynamicProjection = ({`, location confidence 1.00). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3b37cd1b778f0d120710db075f2d33b93a51772a`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 16 violations written to fragments, 363 uncertain, 1513 clean, 0 unanswered
- left for an agentic reviewer: 106 batch(es)

```text
requests: 795 (209 verdicts re-asked with context the model requested)
estimated input tokens: 7407415
billed input tokens: 7093546 (cost $0.2979)
measured chars per token: 3.13
```
