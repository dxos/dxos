//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Harness from '@dxos/plugin-testing/Harness';

import * as DevtoolsPlugin from '#meta';

import { DevtoolsNamespace } from './namespace.ts';

await Harness.preload({ plugins: [DevtoolsPlugin.make()] });

const moduleId = (name: string) => `${DevtoolsNamespace.key}.module.${name}`;

describe('DevtoolsPlugin', () => {
  // Boot imports the app-graph-builder body (the harness fires the plugin's start event), which
  // can exceed the default 15s under vite-node transform load.
  test('modules activate on the expected events', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [DevtoolsPlugin.make()],
    });

    // AppGraphBuilder rides the plugin's start event, fired by the harness after Startup.
    expect(harness.manager.getActive()).toContain(moduleId('AppGraphBuilder'));
  });
});
