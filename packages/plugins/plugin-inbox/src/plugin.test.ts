//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as InboxPlugin from '#meta';

import { InboxNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), InboxPlugin.make()] });

const moduleId = (name: string) => `${InboxNamespace.key}.module.${name}`;

describe('InboxPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), InboxPlugin.make()],
    });

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('schema'), moduleId('OperationHandler')]),
    );
  }, 30_000);
});
