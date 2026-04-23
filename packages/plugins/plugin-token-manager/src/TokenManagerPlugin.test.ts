//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
// Use the CLI variant — the main ClientPlugin references capabilities that resolve to undefined under Node.
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { meta } from './meta';
import { TokenManagerPlugin } from './TokenManagerPlugin';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('TokenManagerPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Skip autoStart: ReactSurface imports atlaskit CSS which is CJS-only and fails in Node.
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), TokenManagerPlugin()],
      autoStart: false,
    });

    await harness.fire(ActivationEvents.Startup);

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('schema')]),
    );
  });
});
