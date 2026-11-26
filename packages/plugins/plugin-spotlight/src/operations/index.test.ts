//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as SpotlightPlugin from '#meta';
import { SpotlightCapabilities } from '#types';

await Harness.preload({ plugins: [SpotlightPlugin.make()] });

describe('LayoutOperation.UpdateDialog', () => {
  test('a close naming a dialog leaves another that has replaced it open', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [SpotlightPlugin.make()] });
    const registry = harness.get(Capabilities.AtomRegistry);
    const state = harness.get(SpotlightCapabilities.State);
    // A scheduled dismiss hides the native window; cancel it so the test never reaches Tauri.
    const dismissScheduled = () => {
      const { dismissTimeout } = registry.get(state);
      clearTimeout(dismissTimeout);
      return dismissTimeout !== undefined;
    };

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replacing' }));
    await harness.runPromise(
      Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replaced', state: false }),
    );
    expect(registry.get(state).dialogContent?.component).toBe('dxn:test:replacing');
    expect(dismissScheduled()).toBe(false);

    await harness.runPromise(
      Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replacing', state: false }),
    );
    expect(dismissScheduled()).toBe(true);
  });
});
