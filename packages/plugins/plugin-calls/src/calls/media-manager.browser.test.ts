//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { waitForCondition } from '@dxos/async';

import { FakeTransport } from '../testing/fake-transport';
import { MediaManager } from './media-manager';

describe('MediaManager transport seam', () => {
  test('publishes local tracks through the injected transport', async ({ expect }) => {
    const fake = new FakeTransport();
    const mediaManager = new MediaManager({ transportFactory: () => fake });
    await mediaManager.open();
    // Placeholder session config; the fake transport never dials it.
    await mediaManager.join({ apiBase: 'https://unused.invalid/api/calls' });

    // On open the manager holds an inaudible audio track and a black-canvas video track; join publishes both.
    await waitForCondition({
      condition: () => fake.published.some((p) => p.track?.kind === 'audio'),
      timeout: 3_000,
    });

    expect(fake.isOpen).toBe(true);
    expect(fake.published.some((p) => p.track?.kind === 'video')).toBe(true);

    await mediaManager.close();
  });
});
