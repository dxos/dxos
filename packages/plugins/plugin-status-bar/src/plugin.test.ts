//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Harness from '@dxos/plugin-testing/Harness';

import * as StatusBarPlugin from '#meta';

import { StatusBarNamespace } from './namespace.ts';

await Harness.preload({ plugins: [StatusBarPlugin.make()] });

const moduleId = (name: string) => `${StatusBarNamespace.key}.module.${name}`;

describe('StatusBarPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [StatusBarPlugin.make()],
    });

    // ReactSurface is role-gated (SurfacesRequested) and parks until one of its roles renders.
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactSurface'));
  });
});
