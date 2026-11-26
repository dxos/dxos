//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as DeckPlugin from '#meta';
import { DeckCapabilities } from '#types';

await Harness.preload({ plugins: [DeckPlugin.make()] });

describe('LayoutOperation.UpdateDialog', () => {
  test('a close keeps what the dialog is showing until its exit has run', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [DeckPlugin.make()] });
    const read = () => harness.get(Capabilities.AtomRegistry).get(harness.get(DeckCapabilities.EphemeralState));

    await harness.runPromise(
      Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:dialog', blockAlign: 'start' }),
    );
    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { state: false }));

    expect(read().dialogOpen).toBe(false);
    expect(read().dialogContent).not.toBeNull();
    expect(read().dialogBlockAlign).toBe('start');

    await vi.waitFor(() => expect(read().dialogContent).toBeNull(), { timeout: 2_000 });
    expect(read().dialogBlockAlign).toBeUndefined();
  });

  test('a dialog opened while the last one is leaving is not cleared by it', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [DeckPlugin.make()] });
    const read = () => harness.get(Capabilities.AtomRegistry).get(harness.get(DeckCapabilities.EphemeralState));

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:leaving' }));
    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { state: false }));
    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:arriving' }));

    await new Promise((resolve) => setTimeout(resolve, 1_000));
    expect(read().dialogOpen).toBe(true);
    expect(read().dialogContent?.component).toBe('dxn:test:arriving');
  });

  test('a close naming a dialog leaves another that has replaced it open', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({ plugins: [DeckPlugin.make()] });
    const read = () => harness.get(Capabilities.AtomRegistry).get(harness.get(DeckCapabilities.EphemeralState));

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replaced' }));
    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replacing' }));
    await harness.runPromise(
      Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replaced', state: false }),
    );
    expect(read().dialogOpen).toBe(true);
    expect(read().dialogContent?.component).toBe('dxn:test:replacing');

    await harness.runPromise(
      Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:replacing', state: false }),
    );
    expect(read().dialogOpen).toBe(false);
  });
});
