//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { LogBuffer } from '@dxos/log';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DebugPlugin } from './DebugPlugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('DebugPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    const logBuffer = new LogBuffer();
    // Skip autoStart: ReactSurface imports browser-only deps that break Node.
    // Fire only the events needed to verify AppGraphBuilder + ReactContext.
    await using harness = await createComposerTestApp({
      plugins: [DebugPlugin({ logBuffer })],
      autoStart: false,
    });

    await harness.fire(AppActivationEvents.SetupAppGraph);

    expect(harness.manager.getActive()).toContain(moduleId('AppGraphBuilder'));
  });
});
