//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { StatusBarPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('StatusBarPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [StatusBarPlugin()],
    });

    // ReactSurface is role-gated (SurfacesRequested) and parks until one of its roles renders.
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactSurface'));
  });
});
