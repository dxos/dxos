# Testing with the composer harness

Two tests every plugin should ship: a **smoke test** (modules activate) and an **operation test** (operations run end-to-end). Both use `createComposerTestApp` from `@dxos/plugin-testing/harness`.

## Setup

```ts
// src/FooPlugin.test.ts
import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';
// IMPORTANT: use the CLI variant — the main ClientPlugin references browser-only capabilities.
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { FooPlugin } from './FooPlugin';
import { meta } from './meta';
import { Print } from './operations';

const moduleId = (name: string) => `${meta.id}.module.${name}`;
```

## Smoke test — modules activate

```ts
describe('FooPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), FooPlugin()],
    });

    // Active after a normal startup.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('metadata'),
        moduleId('schema'),
        moduleId('ReactSurface'),
      ]),
    );

    // Blueprint definitions activate when SetupArtifactDefinition fires
    // (normally fired by AssistantPlugin).
    await harness.fire(AppActivationEvents.SetupArtifactDefinition);
    expect(harness.manager.getActive()).toContain(moduleId('BlueprintDefinition'));

    // Operation handlers are lazy — fire SetupOperationHandler to load them.
    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toContain(moduleId('OperationHandler'));
  });
});
```

This catches the most common bugs: typoed activation events, missing module wiring, and accidentally tree-shaken modules.

## Operation test — invoke real handlers

```ts
test('Print renders ASCII', async ({ expect }) => {
  await using harness = await createComposerTestApp({ plugins: [FooPlugin()] });
  const { ascii } = await harness.invoke(Print, { pgn: '1. e4 e5' });
  expect(ascii).toContain('a  b  c  d  e  f  g  h');
});
```

`harness.invoke(Op, input)` validates the input, loads the handler, runs it under Effect with the declared services, and returns the typed output.

## Why the CLI `ClientPlugin`

The main `@dxos/plugin-client` references browser capabilities that resolve to `undefined` under Node and crash the harness. Always import:

```ts
import { ClientPlugin } from '@dxos/plugin-client/cli';
```

## Storybook

Container storybooks complement these tests by exercising rendering. They aren't a substitute — `test-storybook` doesn't catch missing capabilities or operation regressions.

## Reference

- `packages/plugins/plugin-chess/src/ChessPlugin.test.ts` — smoke + operation tests.
