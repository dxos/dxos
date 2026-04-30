//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { StatusBarPlugin } from './StatusBarPlugin';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('StatusBarPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [StatusBarPlugin()],
    });

    expect(harness.manager.getActive()).toContain(moduleId('ReactSurface'));
  });
});
