//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DevtoolsPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('DevtoolsPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [DevtoolsPlugin()],
    });

    // AppGraphBuilder auto-cascades from Startup (SetupAppGraph).
    expect(harness.manager.getActive()).toContain(moduleId('AppGraphBuilder'));
  });
});
