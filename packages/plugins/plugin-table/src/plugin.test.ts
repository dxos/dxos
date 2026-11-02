//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as TablePlugin from '#meta';

import { TableNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), TablePlugin.make()] });

const moduleId = (name: string) => `${TableNamespace.key}.module.${name}`;

describe('TablePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // on-type-added needs SpaceEvents (not fired in tests).
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), TablePlugin.make()],
    });

    // After autoStart: OperationHandler, schema, and SkillDefinition are dependency-mode roots and
    // all activate immediately.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('OperationHandler'), moduleId('schema')]),
    );
  });
});
