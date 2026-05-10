//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { WnfsPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('WnfsPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), WnfsPlugin()],
    });

    // After autoStart: CreateObject, schema, and OperationHandler all auto-cascade.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('CreateObject'), moduleId('schema'), moduleId('OperationHandler')]),
    );
  });
});
