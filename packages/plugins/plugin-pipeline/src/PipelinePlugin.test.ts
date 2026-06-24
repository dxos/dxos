//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { PipelinePlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('PipelinePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), PipelinePlugin()],
    });

    // After autoStart: CreateObject and schema auto-cascade.
    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('CreateObject'), moduleId('schema')]));
  });
});
