//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Harness from '@dxos/plugin-testing/Harness';

import * as RegistryPlugin from '#meta';

import { RegistryNamespace } from './namespace.ts';

await Harness.preload({ plugins: [RegistryPlugin.make()] });

const moduleId = (name: string) => `${RegistryNamespace.key}.module.${name}`;

describe('RegistryPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [RegistryPlugin.make()],
    });

    // CLI commands activate on demand; the harness fires that wave on the app's behalf.
    expect(harness.manager.getActive()).toContain(moduleId('cli-commands'));
  });
});
