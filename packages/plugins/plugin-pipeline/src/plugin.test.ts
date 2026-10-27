//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as PipelinePlugin from '#meta';

import { PipelineNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), PipelinePlugin.make()] });

const moduleId = (name: string) => `${PipelineNamespace.key}.module.${name}`;

describe('PipelinePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), PipelinePlugin.make()],
    });

    // After autoStart: CreateObject and schema auto-cascade.
    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('schema')]));
  });
});
