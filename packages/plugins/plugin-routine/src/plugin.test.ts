//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as RoutinePlugin from '#meta';

import { RoutineNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), RoutinePlugin.make()] });

const moduleId = (name: string) => `${RoutineNamespace.key}.module.${name}`;

describe('RoutinePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), RoutinePlugin.make()],
    });

    // After autoStart: AppGraphBuilder, schema, OperationHandler all auto-cascade.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('schema'), moduleId('OperationHandler')]),
    );
  });
});
