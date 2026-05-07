//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SpacePlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('SpacePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), SpacePlugin({})],
    });

    // After autoStart: metadata, schema, OperationHandler all auto-cascade.
    // UndoMappings auto-cascades on SetupOperationHandler.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('metadata'),
        moduleId('schema'),
        moduleId('OperationHandler'),
        moduleId('UndoMappings'),
      ]),
    );
  });
});
