//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { NavTreePlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('NavTreePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [NavTreePlugin()],
    });

    // OperationHandler is a dependency-mode root, so it activates immediately too.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('OperationHandler')]),
    );
  });
});
