//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { useAudioFile } from './useAudioFile.ts';

/** A fetch whose response the test settles, keyed by URL, so loads can complete in any order. */
const deferredFetch = () => {
  const pending = new Map<string, { resolve: () => void; reject: (error: Error) => void }>();
  const fetch = (url: string) =>
    new Promise<{ blob: () => Promise<Blob> }>((resolve, reject) => {
      pending.set(url, { resolve: () => resolve({ blob: async () => new Blob() }), reject });
    });
  const settle = (url: string) => {
    const entry = pending.get(url);
    if (!entry) {
      throw new Error(`no fetch started for ${url}`);
    }
    return entry;
  };
  return { fetch, pending, settle };
};

class FakeAudio extends EventTarget {
  src = '';
  load() {
    queueMicrotask(() => this.dispatchEvent(new Event('canplay')));
  }
  pause() {}
  play() {}
}

class FakeAudioContext {
  state = 'running';
  async resume() {}
  createMediaStreamDestination() {
    const track = { applyConstraints: async () => {} };
    return { channelCount: 1, stream: { getAudioTracks: () => [track] } };
  }
  createMediaElementSource() {
    return { connect: () => {} };
  }
}

describe('useAudioFile', () => {
  let network: ReturnType<typeof deferredFetch>;
  beforeEach(() => {
    network = deferredFetch();
    vi.stubGlobal('fetch', network.fetch);
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${Math.random()}`);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  test('a superseded load that fails after the current one loads does not replace it', async () => {
    const { result, rerender } = renderHook(({ url }) => useAudioFile(url), { initialProps: { url: 'a' } });
    await waitFor(() => expect(network.pending.has('a')).toBe(true));

    rerender({ url: 'b' });
    await waitFor(() => expect(network.pending.has('b')).toBe(true));
    network.settle('b').resolve();
    await waitFor(() => expect(result.current.audio).toBeDefined());
    const current = result.current.audio;

    network.settle('a').reject(new Error('a failed'));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.error).toBeUndefined();
    expect(result.current.audio).toBe(current);
  });

  test('a failed load reports its error', async () => {
    const { result } = renderHook(() => useAudioFile('missing'));
    await waitFor(() => expect(network.pending.has('missing')).toBe(true));
    network.settle('missing').reject(new Error('not found'));
    await waitFor(() => expect(result.current.error?.message).toBe('not found'));
  });
});
