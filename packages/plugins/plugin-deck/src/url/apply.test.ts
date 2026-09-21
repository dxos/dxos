//
// Copyright 2026 DXOS.org
//

import { afterEach, describe, test, vi } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { DeckPlugin } from '#plugin';
import { DeckCapabilities } from '#types';

import { applyActive } from './apply.ts';
import * as Navigation from './navigation.ts';

type UpdateCallback = () => Promise<void>;

describe('applyActive', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('a transition does not revert state written while it captures the old view', async ({ expect }) => {
    const callbacks: UpdateCallback[] = [];
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      startViewTransition: (callback: UpdateCallback) => {
        callbacks.push(callback);
        return {};
      },
    });
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
      addEventListener: () => {},
      removeEventListener: () => {},
    });

    await using harness = await createComposerTestApp({ plugins: [DeckPlugin()] });
    const readEphemeral = () =>
      harness.get(Capabilities.AtomRegistry).get(harness.get(DeckCapabilities.EphemeralState));

    await harness.runPromise(
      Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:dialog', state: true }),
    );
    expect(readEphemeral().dialogOpen).toBe(true);

    const navigating = harness.runPromise(
      applyActive([{ id: 'item-1', segment: Navigation.segmentOf(undefined, 'doc/1') }], { transition: true }),
    );
    await flush();
    const [callback] = callbacks;
    expect(callback).toBeDefined();

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { state: false }));
    expect(readEphemeral().dialogOpen).toBe(false);

    await callback!();
    await navigating;

    expect(readEphemeral().dialogOpen).toBe(false);
    expect(readEphemeral().open.default?.active).toEqual(['item-1']);
  });
});

const flush = () => new Promise<void>((resolve) => setTimeout(resolve));
