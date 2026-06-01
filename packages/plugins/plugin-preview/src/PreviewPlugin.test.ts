//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { PreviewPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('PreviewPlugin', () => {
  test('modules activate on the expected events', { timeout: 10_000 }, async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), PreviewPlugin()],
    });

    // After autoStart: schema auto-cascades from ClientPlugin.
    expect(harness.manager.getActive()).toContain(moduleId('schema'));
  });
});
