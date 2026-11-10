//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as TemplatePlugin from '#meta';

import { TemplateNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), TemplatePlugin.make()] });

const moduleId = (name: string) => `${TemplateNamespace.key}.module.${name}`;

describe('TemplatePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), TemplatePlugin.make()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('schema')]));
    // ReactSurface is role-gated (SurfacesRequested) and parks until its role renders.
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactSurface'));
  }, 20_000);
});
