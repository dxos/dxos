//
// Copyright 2026 DXOS.org
//

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { createClient, createClientContextProvider } from '../testing/util.tsx';
import { useFeedSyncState } from './useFeedSyncState.ts';

const POLL_INTERVAL_MS = 20;

let visibilityState: DocumentVisibilityState = 'visible';

const setVisibility = (state: DocumentVisibilityState) => {
  visibilityState = state;
  document.dispatchEvent(new Event('visibilitychange'));
};

// The hook reads `document.visibilityState`, which jsdom exposes as a read-only accessor.
Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => visibilityState });

afterEach(() => {
  visibilityState = 'visible';
});

describe('useFeedSyncState', () => {
  test('suspends polling while the document is hidden and re-polls on resume', async () => {
    const { client } = await createClient({ createIdentity: true, createSpace: true });
    const feedService = client.services.services.FeedService;
    if (!feedService) {
      throw new Error('FeedService unavailable.');
    }
    const getSyncState = vi.spyOn(feedService, 'getSyncState');

    const wrapper = await createClientContextProvider(client);
    const { unmount } = renderHook(() => useFeedSyncState(POLL_INTERVAL_MS), { wrapper });

    await waitFor(() => expect(getSyncState.mock.calls.length).to.be.greaterThan(1));

    setVisibility('hidden');
    const callsWhenHidden = getSyncState.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS * 5));
    expect(getSyncState.mock.calls.length).to.eq(callsWhenHidden);

    setVisibility('visible');
    await waitFor(() => expect(getSyncState.mock.calls.length).to.be.greaterThan(callsWhenHidden));

    unmount();
    const callsAfterUnmount = getSyncState.mock.calls.length;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS * 5));
    expect(getSyncState.mock.calls.length).to.eq(callsAfterUnmount);
  });
});
