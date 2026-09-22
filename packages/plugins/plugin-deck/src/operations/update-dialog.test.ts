//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DeckPlugin } from '#plugin';
import { DeckCapabilities } from '#types';

describe('LayoutOperation.UpdateDialog', () => {
  test('a close keeps what the dialog is showing until its exit has run', async ({ expect }) => {
    await using harness = await createComposerTestApp({ plugins: [DeckPlugin()] });
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
    await using harness = await createComposerTestApp({ plugins: [DeckPlugin()] });
    const read = () => harness.get(Capabilities.AtomRegistry).get(harness.get(DeckCapabilities.EphemeralState));

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:leaving' }));
    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { state: false }));
    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:arriving' }));

    await new Promise((resolve) => setTimeout(resolve, 1_000));
    expect(read().dialogOpen).toBe(true);
    expect(read().dialogContent?.component).toBe('dxn:test:arriving');
  });
});
