//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { AppActivationEvents } from '@dxos/app-toolkit';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DebugPlugin } from '#plugin';
import { meta } from './meta';

const moduleId = (name: string) => `${meta.id}.module.${name}`;

describe('DebugPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // logStore is only used by ReactSurface (not included in node variant), so a stub suffices.
    await using harness = await createComposerTestApp({
      plugins: [DebugPlugin({ logStore: null as unknown as IdbLogStore })],
    });

    // AppGraphBuilder auto-cascades from Startup (SetupAppGraph).
    expect(harness.manager.getActive()).toContain(moduleId('AppGraphBuilder'));

    // DebugSettings still needs manual SetupSettings fire (not auto-cascaded).
    await harness.fire(AppActivationEvents.SetupSettings);
    expect(harness.manager.getActive()).toContain(moduleId('DebugSettings'));
  });
});
