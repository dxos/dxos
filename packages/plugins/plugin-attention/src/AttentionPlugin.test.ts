//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { GraphPlugin } from '@dxos/plugin-graph/plugin';

import { AttentionPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('AttentionPlugin', () => {
  test('modules activate on startup', async ({ expect }) => {
    await using harness = await createTestApp({
      plugins: [GraphPlugin(), ProcessManagerPlugin(), AttentionPlugin()],
    });

    // All modules are dependency-mode and activate during the startup dependency pass.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('attention'),
        moduleId('ReactContext'),
        moduleId('Keyboard'),
        moduleId('OperationHandler'),
      ]),
    );
  });
});
