---
branch: dm/epic-newton-fqo5km
commit: 10070cc1c7f931afa099c225b18eb904e617e5d3
base: 3fc554dfb2a2868f410dfbebf2264c0c89b3d665
mode: fast
createdAt: 2026-11-19T13:30:06.987Z
isFinalized: true
groups: 134
rules: [consistent-file-naming-within-folder, effect-fn-not-hand-wrapped-gen, log-fire-and-forget-rejections, no-casts, no-sleep-in-test, no-try-catch-in-effect-code, options-object-with-defaults, structured-logging-not-console, use-context-scoped-cancellation]
reviewId: 10070cc1
---

_2 error(s), 9 warning(s)._

## Index

<!-- `- <id> - unresolved|ignored|resolved - <rule> - <file:line[:col]>` -->

- 10070cc1-1 - ignored - no-casts - packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/Loader.solid-stories.tsx:38
- 10070cc1-2 - ignored - structured-logging-not-console - packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/Loader.solid-stories.tsx:146
- 10070cc1-3 - ignored - options-object-with-defaults - packages/sdk/client/src/services/dedicated/dedicated-worker-client-services.ts:30
- 10070cc1-4 - ignored - no-sleep-in-test - packages/sdk/worker-framework/src/Client.test.ts:121
- 10070cc1-5 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/Client.test.ts:858
- 10070cc1-6 - ignored - no-try-catch-in-effect-code - packages/sdk/worker-framework/src/Client.ts:475
- 10070cc1-7 - ignored - no-casts - packages/sdk/worker-framework/src/Client.ts:1035
- 10070cc1-8 - resolved - log-fire-and-forget-rejections - packages/sdk/worker-framework/src/stories/TabHandover.stories.tsx:113
- 10070cc1-9 - ignored - consistent-file-naming-within-folder - packages/sdk/worker-framework/src/stories/TabHandover.stories.tsx:284
- 10070cc1-10 - ignored - use-context-scoped-cancellation - packages/sdk/worker-framework/src/testing/harness.ts:100
- 10070cc1-11 - ignored - effect-fn-not-hand-wrapped-gen - packages/sdk/worker-framework/src/testing/harness.ts:440

## Issues

# ERROR 10070cc1-1 no-casts `packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/Loader.solid-stories.tsx:38`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 38-49 (`const meta: Meta<StoryArgs> = {`, location confidence 0.97). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10070cc1-2 structured-logging-not-console `packages/sdk/app-framework/src/vite-plugin/boot-loader/loader-app/Loader.solid-stories.tsx:146`

System One judges this a likely violation of `structured-logging-not-console` (Use the project logger, at the right level, without spam), p=0.84. The likeliest place is lines 146-157 (`export const Stalled: Story = {`, location confidence 0.86). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10070cc1-3 options-object-with-defaults `packages/sdk/client/src/services/dedicated/dedicated-worker-client-services.ts:30`

System One judges this a likely violation of `options-object-with-defaults` (A config parameter is a defaulted options object, not required positional args), p=0.86. The likeliest place is lines 30-38 (`export type WorkerTakeoverOptions = Pick<`, location confidence 0.30). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10070cc1-4 no-sleep-in-test `packages/sdk/worker-framework/src/Client.test.ts:121`

System One judges this a likely violation of `no-sleep-in-test` (No sleep or polling in tests), p=0.95. The likeliest place is lines 121-144 (`const error = await asyncTimeout(failure.wait(), 5_000);`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10070cc1-5 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/Client.test.ts:858`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.83. The likeliest place is lines 858-878 (`Effect.gen(function* () {`, location confidence 0.98). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10070cc1-6 no-try-catch-in-effect-code `packages/sdk/worker-framework/src/Client.ts:475`

System One judges this a likely violation of `no-try-catch-in-effect-code` (Handle errors with Effect's error channel, never try/catch), p=0.80. The likeliest place is lines 475-486 (`async #stop(notify: () => void): Promise<void> {`, location confidence 0.31). This is a single-shot classifier: confirm against the rule before acting.

# ERROR 10070cc1-7 no-casts `packages/sdk/worker-framework/src/Client.ts:1035`

System One judges this a likely violation of `no-casts` (No casts to silence the type-checker), p=0.94. The likeliest place is lines 1035-1056 (`} catch (error: any) {`, location confidence 0.60). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10070cc1-8 log-fire-and-forget-rejections `packages/sdk/worker-framework/src/stories/TabHandover.stories.tsx:113`

System One judges this a likely violation of `log-fire-and-forget-rejections` (A fire-and-forget promise logs its rejection, never swallows it), p=0.93. The likeliest place is lines 113-127 (`},`, location confidence 0.91). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10070cc1-9 consistent-file-naming-within-folder `packages/sdk/worker-framework/src/stories/TabHandover.stories.tsx:284`

System One judges this a likely violation of `consistent-file-naming-within-folder` (Keep filenames within one folder to a single convention), p=0.80. The likeliest place is lines 284-288 (`export const Default: Story = {`, location confidence 0.65). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10070cc1-10 use-context-scoped-cancellation `packages/sdk/worker-framework/src/testing/harness.ts:100`

System One judges this a likely violation of `use-context-scoped-cancellation` (Schedule timeouts through the ctx-aware scheduler), p=0.83. The likeliest place is lines 100-111 (`const held = heldFor.get(message.clientId);`, location confidence 0.89). This is a single-shot classifier: confirm against the rule before acting.

# WARN 10070cc1-11 effect-fn-not-hand-wrapped-gen `packages/sdk/worker-framework/src/testing/harness.ts:440`

System One judges this a likely violation of `effect-fn-not-hand-wrapped-gen` (Define Effect-returning functions with Effect.fn/fnUntraced, not a hand-wrapped Effect.gen), p=0.84. The likeliest place is lines 440-451 (`const createWorker = createWorkerFactory(storageLockKey, {`, location confidence 0.76). This is a single-shot classifier: confirm against the rule before acting.

## Appendix

### System One pass

- model: jev-latest
- base for context: `3fc554dfb2a2868f410dfbebf2264c0c89b3d665`
- thresholds: violation ≥ 0.8; uncertain ≥ 0.15 and ≥ the rule's median across this run + 0.15 (rules with 20+ verdicts); context fetched when asked with ≥ 0.35
- verdicts: 11 violations written to fragments, 385 uncertain, 399 clean, 0 unanswered
- left for an agentic reviewer: 83 batch(es)

```text
requests: 542 (222 verdicts re-asked with context the model requested)
estimated input tokens: 5178317
billed input tokens: 5079281 (cost $0.2133)
measured chars per token: 3.06
```
