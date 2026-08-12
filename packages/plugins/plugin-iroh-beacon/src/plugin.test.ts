//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { IrohBeaconPlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('IrohBeaconPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [IrohBeaconPlugin()],
    });

    // Both of this plugin's real modules are demand-gated, so the plugin contributes nothing to
    // the boot floor. Asserted rather than assumed: an omitted gate is invisible to every other
    // check, and the beacon rides `SpacesReady` precisely to stay off startup.
    const active = harness.manager.getActive();
    // Runtime event: the harness never observes ready spaces.
    expect(active).not.toContain(moduleId('BeaconServiceModule'));
    // Role-gated: no `statusIndicator` surface has mounted.
    expect(active).not.toContain(moduleId('ReactSurface'));
  });
});
