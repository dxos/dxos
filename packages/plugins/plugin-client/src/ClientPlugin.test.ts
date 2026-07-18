//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

// #plugin resolves to ClientPlugin.node.ts under the source condition used by vitest.
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('ClientPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({})],
    });

    // All three are dependency-mode roots (no requires), so they activate during the startup
    // dependency pass without waiting on any event.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('Client'), moduleId('SchemaDefs'), moduleId('OperationHandler')]),
    );
  });
});
