//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { TemplatePlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('TemplatePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), TemplatePlugin()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('schema')]));
    // ReactSurface is role-gated (SurfacesRequested) and parks until its role renders.
    expect(harness.manager.getActive()).not.toContain(moduleId('ReactSurface'));
  }, 20_000);
});
