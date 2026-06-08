---
name: storybook-play-tests
description: >-
  Idiom for writing Storybook play-function tests in DXOS. Use when adding
  interaction tests to stories that involve plugin operations, especially when
  you want to assert operations were invoked without loading the full plugin
  stack or triggering real side effects (navigation, network calls, etc.).
---

# Storybook play-function tests (DXOS)

## Core idiom: `makeOperationCapture`

When a story tests a component that calls plugin operations (via `useOperationInvoker` / `invokePromise`), use `makeOperationCapture` from `@dxos/app-framework/testing` to:

1. **Mock specific operations** — captured and short-circuited (not executed). Use for operations with side effects you don't want in Storybook: navigation (`LayoutOperation.Open`), network calls, space mutations, etc.
2. **Let other operations execute** — pass through to the real invoker. Use for operations that need to run so your component works correctly: chat creation, object queries, etc.

All operations (mocked and real) are **recorded** and accessible via `getCalls(op)`.

## When to use this instead of loading the full plugin stack

When a component uses operations from plugin A but you're testing behavior in plugin B:

- **Include** plugin B's handler (or the handler you're testing).
- **Mock** plugin A's operations — you don't need them to execute, you just need to assert they were triggered.

Example: `SpaceHomeArticle` (plugin-support) calls `AssistantOperation.RunPromptInNewChat` (plugin-assistant). The story loads `AssistantPlugin` but mocks `RunPromptInNewChat` so no navigation fires.

## API

```ts
import { makeOperationCapture } from '@dxos/app-framework/testing';
import { fn } from 'storybook/test';

const capture = makeOperationCapture(
  // Operations to mock (captured, not executed):
  [LayoutOperation.Open, AssistantOperation.RunPromptInNewChat],
  fn, // from storybook/test — enables Actions panel + vi matchers
);
```

Wire the capture into `withPluginManager` via the `capabilities` provider function:

```ts
withPluginManager({
  plugins: [...corePlugins(), ClientPlugin(...), MyPlugin()],
  capabilities: (manager) => capture.wrap(manager),
})
```

`capture.wrap(manager)` reads the real `OperationInvoker` from the manager and replaces it with a recording wrapper — so mocked operations are no-ops and real operations still execute.

## Asserting in play functions

```ts
play: async ({ canvasElement }) => {
  capture.reset(); // clear between stories / steps
  const canvas = within(canvasElement);

  const button = await canvas.findByText('Draft a new document', {}, { timeout: 10000 });
  await userEvent.click(button);

  // Assert a mocked operation was triggered with specific input:
  const calls = capture.getCalls(AssistantOperation.RunPromptInNewChat);
  await expect(calls).toHaveLength(1);          // always exact, never toBeGreaterThan
  await expect(calls[0].input.prompt).toBe('Draft a new document');

  // Assert a real operation executed (still recorded):
  const chatCalls = capture.getCalls(AssistantOperation.CreateChat);
  await expect(chatCalls).toHaveLength(1);
  await expect(chatCalls[0].input.addToSpace).toBe(false);
}
```

**Rules:**
- Always use `toHaveLength(N)` with an exact count — never `toBeGreaterThan`.
- Always `await expect(...)` (the rule `no-floating-promises` requires it).
- Call `capture.reset()` at the start of each play function to clear state from prior stories.

## Full example

See [`SpaceHomeArticle.stories.tsx`](../../../packages/plugins/plugin-support/src/containers/SpaceHomeArticle/SpaceHomeArticle.stories.tsx) for a complete working example. Key points:

- `AssistantOperation.RunPromptInNewChat` and `LayoutOperation.Open` are mocked (no navigation in Storybook).
- `AssistantOperation.CreateChat` is real — the in-memory chat is created so the submit flow actually works.
- `SuggestionCardClick` asserts the prompt text is forwarded correctly.
- `CustomPromptSubmit` asserts both chat creation (real) and navigation (mocked) are triggered.

## withPluginManager setup pattern for stories with operations

```ts
import { makeOperationCapture, withPluginManager } from '@dxos/app-framework/testing';
import { LayoutOperation } from '@dxos/app-toolkit';
import { MyOperation } from '@dxos/my-plugin';
import { MyPlugin } from '@dxos/my-plugin/testing'; // eager re-export, avoids TDZ
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { fn } from 'storybook/test';

const capture = makeOperationCapture(
  [LayoutOperation.Open, MyOperation.SomeNavigationOp],
  fn,
);

const meta = {
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              yield* Effect.promise(() => personalSpace.waitUntilReady());
            }),
        }),
        MyPlugin(), // provides handlers for ops you want to execute for real
      ],
      capabilities: (manager) => capture.wrap(manager),
    }),
  ],
};
```

## Important: use `/testing` entrypoints for plugins in Storybook

Always import plugins via their `/testing` entrypoint in stories (e.g. `@dxos/plugin-assistant/testing`), not the default `@dxos/plugin-assistant`. The default export uses `Plugin.lazy(...)` (dynamic import), which can produce TDZ errors under Vite's module evaluation in Storybook. The `/testing` entrypoint is an eager re-export of the same plugin.

```ts
// ✓ correct
import { AssistantPlugin } from '@dxos/plugin-assistant/testing';

// ✗ may cause TDZ under vite-dev
import { AssistantPlugin } from '@dxos/plugin-assistant';
```

## `makeOperationCapture` source

[`packages/sdk/app-framework/src/testing/operationCapture.ts`](../../../packages/sdk/app-framework/src/testing/operationCapture.ts) — exported from `@dxos/app-framework/testing`.
