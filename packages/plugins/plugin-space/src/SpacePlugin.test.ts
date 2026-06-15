//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SpacePlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('SpacePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), SpacePlugin({})],
    });

    // After autoStart: CreateObject, schema, OperationHandler all auto-cascade.
    // UndoMappings auto-cascades on SetupProcessManager.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([
        moduleId('CreateObject'),
        moduleId('schema'),
        moduleId('OperationHandler'),
        moduleId('UndoMappings'),
      ]),
    );
  });
});
