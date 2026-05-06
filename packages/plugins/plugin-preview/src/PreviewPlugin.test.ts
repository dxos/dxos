//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { PreviewPlugin } from './index';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('PreviewPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), PreviewPlugin()],
    });

    // After autoStart: schema auto-cascades from ClientPlugin.
    expect(harness.manager.getActive()).toContain(moduleId('schema'));
  });
});
