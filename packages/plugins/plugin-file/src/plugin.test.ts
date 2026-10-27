//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as FilePlugin from '#meta';

import { FileNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), FilePlugin.make()] });

const moduleId = (name: string) => `${FileNamespace.key}.module.${name}`;

describe('FilePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), FilePlugin.make()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
  }, 30_000);
});
