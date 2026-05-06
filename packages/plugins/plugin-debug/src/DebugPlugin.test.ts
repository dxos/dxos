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
    // Skip autoStart: ReactSurface and ReactContext import browser-only deps (@dxos/devtools,
    // react-surface browser components) that are slow/broken in Node. Startup is therefore
    // skipped; only the safe non-browser modules (AppGraphBuilder, DebugSettings) are tested.
    await using harness = await createComposerTestApp({
      plugins: [DebugPlugin({ logBuffer })],
      autoStart: false,
    });

    // AppGraphBuilder activates on SetupAppGraph; DebugSettings on SetupSettings — both safe in Node.
    await harness.fire(AppActivationEvents.SetupAppGraph);
    await harness.fire(AppActivationEvents.SetupSettings);

    expect(harness.manager.getActive()).toEqual(
      expect.arrayContaining([moduleId('AppGraphBuilder'), moduleId('DebugSettings')]),
    );
  });
});
