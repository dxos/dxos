//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { TransformerPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('TransformerPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), TransformerPlugin()],
    });

    // Modules expected to be active after a normal startup.
    expect(harness.manager.getActive()).toContain(moduleId('schema'));
  });
});
