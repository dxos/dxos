//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SheetPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('SheetPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), SheetPlugin()],
    });

    // OperationHandler and UndoMappings are dependency-mode roots, so they activate immediately too.
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
