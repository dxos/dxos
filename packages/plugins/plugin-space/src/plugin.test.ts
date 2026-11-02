//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as SpacePlugin from '#meta';

import { SpaceNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), SpacePlugin.make({})] });

const moduleId = (name: string) => `${SpaceNamespace.key}.module.${name}`;

describe('SpacePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), SpacePlugin.make({})],
    });

    // After autoStart: CreateObject, schema, OperationHandler all auto-cascade.
    // UndoMappings auto-cascades on SetupProcessManager.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler'), moduleId('UndoMappings')]),
    );
  });
});
