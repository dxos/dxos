//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SheetPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('SheetPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), SheetPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('CreateObject'), moduleId('schema')]));

    await harness.fire(ActivationEvents.SetupProcessManager);
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('OperationHandler'), moduleId('UndoMappings')]),
    );
  });
});
