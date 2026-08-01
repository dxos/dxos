//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DevtoolsPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('DevtoolsPlugin', () => {
  // Boot imports the app-graph-builder body (the harness fires the plugin's start event), which
  // can exceed the default 15s under vite-node transform load.
  test('modules activate on the expected events', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [DevtoolsPlugin()],
    });

    // AppGraphBuilder rides the plugin's start event, fired by the harness after Startup.
    expect(harness.manager.getActive()).toContain(moduleId('AppGraphBuilder'));
  });
});
