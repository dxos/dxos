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

describe('applyActive', () => {
  afterEach(() => vi.unstubAllGlobals());

  test('a transition does not revert state written while it captures the old view', async ({ expect }) => {
    let captured: () => Promise<void>;
    vi.stubGlobal('document', {
      visibilityState: 'visible',
      startViewTransition: (callback: () => Promise<void>) => ((captured = callback), {}),
    });
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
      location: { href: 'http://localhost/' },
      addEventListener: () => {},
      removeEventListener: () => {},
    });

    await using harness = await createComposerTestApp({ plugins: [DeckPlugin()] });
    const read = () => harness.get(Capabilities.AtomRegistry).get(harness.get(DeckCapabilities.EphemeralState));

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { subject: 'dxn:test:dialog' }));
    const navigating = harness.runPromise(
      applyActive([{ id: 'item-1', segment: Navigation.segmentOf(undefined, 'doc/1') }], { transition: true }),
    );
    await new Promise((resolve) => setTimeout(resolve));

    await harness.runPromise(Operation.invoke(LayoutOperation.UpdateDialog, { state: false }));
    await captured!();
    await navigating;

    expect(read().dialogOpen).toBe(false);
    expect(read().open.default?.active).toEqual(['item-1']);
  });
});
