//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { TemplatePlugin } from '#plugin';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('TemplatePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), TemplatePlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('metadata'), moduleId('schema'), moduleId('ReactSurface')]),
    );
  }, 20_000);
});
