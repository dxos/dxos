//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as TransformerPlugin from '#meta';

import { TransformerNamespace } from './namespace.ts';

await Harness.preload({ plugins: [ClientPlugin.make({}), TransformerPlugin.make()] });

const moduleId = (name: string) => `${TransformerNamespace.key}.module.${name}`;

describe('TransformerPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), TransformerPlugin.make()],
    });

    // Modules expected to be active after a normal startup.
    expect(harness.manager.getActive()).toContain(moduleId('translations'));
  });
});
