//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { ClientPlugin } from '@dxos/plugin-client/cli';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { PreviewPlugin } from './PreviewPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('PreviewPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Skip autoStart: ReactSurface imports atlaskit CSS which is CJS-only and fails in Node.
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin({}), PreviewPlugin()],
      autoStart: false,
    });

    await harness.fire(ActivationEvents.Startup);

    expect(harness.manager.getActive()).toContain(moduleId('schema'));
  });
});
