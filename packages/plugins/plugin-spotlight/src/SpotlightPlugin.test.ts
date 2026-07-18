//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SpotlightPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('SpotlightPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [SpotlightPlugin()],
    });

    // State, SpotlightDismiss, ReactRoot, and OperationHandler are all dependency-mode roots, so they
    // all activate immediately.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('State'),
        moduleId('SpotlightDismiss'),
        moduleId('ReactRoot'),
        moduleId('OperationHandler'),
      ]),
    );
  });
});
