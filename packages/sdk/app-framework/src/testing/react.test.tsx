//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import { ActivationEvents, Capabilities } from '../common';
import { Capability, Plugin } from '../core';
import { Surface } from '../ui';
import { createTestApp } from './harness';
import { render, renderSurface } from './react';

const testMeta = { id: DXN.make('org.dxos.plugin.test.reactHarness'), name: 'ReactHarnessTest' };

const TestPlugin = Plugin.define(testMeta).pipe(
  Plugin.addModule({
    id: 'surfaces',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () =>
      Effect.succeed(
        Capability.contributes(Capabilities.ReactSurface, [
          Surface.create<{ message: string }>({
            id: DXN.make('org.dxos.test.surface.greeting'),
            role: 'greeting',
            component: ({ data }) => <span data-testid='greeting'>hello {data.message}</span>,
          }),
        ]),
      ),
  }),
  Plugin.make,
);

describe('testing/react', () => {
  test('render wraps ui in the harness provider tree', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [TestPlugin()] });
    const view = render(harness, <span data-testid='hello'>world</span>);
    expect(view.getByTestId('hello').textContent).toBe('world');
  });

  test('renderSurface mounts a surface registered by a plugin', async ({ expect }) => {
    await using harness = await createTestApp({ plugins: [TestPlugin()] });
    const view = renderSurface(harness, { role: 'greeting', data: { message: 'plugins' } });
    const node = await view.findByTestId('greeting');
    expect(node.textContent).toBe('hello plugins');
  });
});
