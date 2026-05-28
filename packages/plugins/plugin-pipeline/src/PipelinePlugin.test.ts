//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { PipelinePlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${DXN.getName(meta.id)}.module.${name}`;

describe('PipelinePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), PipelinePlugin()],
    });

    // After autoStart: AppGraphBuilder, CreateObject, schema all auto-cascade.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('CreateObject'), moduleId('schema')]),
    );
  });
});
