//
// Copyright 2026 DXOS.org
//
// @vitest-environment happy-dom

import { describe, expect, test, vi } from 'vitest';

import { MAIN_AREA, ScrollTracker } from './tracker.ts';

describe('ScrollTracker', () => {
  test('a nested viewport that registers first never takes the main restore', async () => {
    const root = document.createElement('div');
    const outer = root.appendChild(document.createElement('div'));
    const inner = outer.appendChild(document.createElement('div'));
    const initial = vi.fn(() => undefined);
    const onScroll = vi.fn();
    const tracker = new ScrollTracker(() => ({ initial, onScroll, interval: 0 }));
    tracker.setRoot(root);

    // Child effects run before their parent's, so the nested viewport registers first.
    tracker.register(inner);
    tracker.register(outer);
    await Promise.resolve();

    expect(initial).toHaveBeenCalledTimes(1);
    expect(initial).toHaveBeenCalledWith(MAIN_AREA);

    inner.dispatchEvent(new Event('scroll'));
    outer.dispatchEvent(new Event('scroll'));
    await vi.waitFor(() => expect(onScroll).toHaveBeenCalled());
    expect(onScroll).toHaveBeenCalledTimes(1);
    tracker.dispose();
  });
});
