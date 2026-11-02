//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as SheetPlugin from '#meta';

import { SheetNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), SheetPlugin.make()] });

const moduleId = (name: string) => `${SheetNamespace.key}.module.${name}`;

describe('SheetPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), SheetPlugin.make()],
    });

    // OperationHandler and UndoMappings are dependency-mode roots, so they activate immediately too.
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler'), moduleId('UndoMappings')]),
    );
  });
});
