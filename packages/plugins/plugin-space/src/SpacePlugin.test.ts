//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SpacePlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('SpacePlugin', () => {
  // Booting a real client and resolving the operation-handler set takes ~12s on modest hardware, so the
  // default 15s per-test budget leaves no headroom under concurrent runs.
  test('modules activate on the expected events', { timeout: 60_000 }, async ({ expect }) => {
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
