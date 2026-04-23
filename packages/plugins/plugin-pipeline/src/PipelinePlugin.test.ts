//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { PipelinePlugin } from './PipelinePlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('PipelinePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Skip autoStart: ReactSurface imports browser-only deps that fail in Node.
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), PipelinePlugin()],
      autoStart: false,
    });

    await harness.fire(ActivationEvents.Startup);

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('metadata'), moduleId('schema')]),
    );
  });
});
