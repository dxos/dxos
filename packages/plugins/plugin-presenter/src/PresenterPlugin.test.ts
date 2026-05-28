//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { PresenterPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${DXN.getName(meta.id)}.module.${name}`;

describe('PresenterPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [PresenterPlugin()],
    });

    expect(harness.manager.getActive()).toContain(moduleId('AppGraphBuilder'));
  });
});
