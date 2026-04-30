//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { SheetPlugin } from './SheetPlugin';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('SheetPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), SheetPlugin()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('metadata'), moduleId('schema'), moduleId('ReactSurface')]),
    );

    await harness.fire(ActivationEvents.SetupOperationHandler);
    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('OperationHandler'), moduleId('undo-mappings')]),
    );
  });
});
