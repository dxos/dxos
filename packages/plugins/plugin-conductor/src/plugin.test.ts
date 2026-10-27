//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as ConductorPlugin from '#meta';

import { ConductorNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), ConductorPlugin.make()] });

const moduleId = (name: string) => `${ConductorNamespace.key}.module.${name}`;

describe('ConductorPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), ConductorPlugin.make()],
    });

    // Modules expected to be active after a normal startup.
    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('schema')]));
    // ReactSurface is role-gated (SurfacesRequested) and parks until its role renders.
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactSurface'));
  });
});
