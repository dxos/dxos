//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { IrohBeaconPlugin } from './IrohBeaconPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('IrohBeaconPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [IrohBeaconPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('ReactSurface')]));
  });
});
