//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import * as GraphPlugin from '@dxos/plugin-graph/GraphPlugin';

import { meta } from '#meta';
import { AttentionPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('AttentionPlugin', () => {
  test('modules activate on startup', async ({ expect }) => {
    await using harness = await createTestApp({
      plugins: [GraphPlugin.make(), ProcessManagerPlugin(), AttentionPlugin()],
    });

    // All modules are dependency-mode and activate during the startup dependency pass. `#plugin`
    // resolves the node barrel here, which stubs `ReactContext` — a context provider contributes
    // nothing without a React tree — so the rest is what this environment is expected to carry.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('attention'), moduleId('Keyboard'), moduleId('OperationHandler')]),
    );
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactContext'));
  });
});
