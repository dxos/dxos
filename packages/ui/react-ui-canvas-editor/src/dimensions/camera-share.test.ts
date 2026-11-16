//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { type Camera } from '@dxos/react-ui-canvas';

import { CameraShare, FOLLOW_GLIDE_MS, SHARE_INTERVAL_MS } from './camera-share.ts';

const A: Camera = { x: 0, y: 0, zoom: 1 };
const B: Camera = { x: 50, y: 0, zoom: 1 };
const C: Camera = { x: 0, y: 80, zoom: 2 };

describe('CameraShare', () => {
  let shared: Camera[];
  let share: CameraShare;
  beforeEach(() => {
    vi.useFakeTimers();
    shared = [];
    share = new CameraShare((camera) => shared.push(camera));
  });
  afterEach(() => {
    share.dispose();
    vi.useRealTimers();
  });

  test('shares at most once an interval, then the last camera', () => {
    share.moved(A);
    share.moved(B);
    share.moved(C);
    expect(shared).toEqual([A]);
    vi.advanceTimersByTime(SHARE_INTERVAL_MS);
    expect(shared).toEqual([A, C]);
  });

  test('a view that moves away and back within an interval shares nothing more', () => {
    share.moved(A);
    share.moved(B);
    share.moved(A);
    vi.advanceTimersByTime(SHARE_INTERVAL_MS * 2);
    expect(shared).toEqual([A]);
  });

  test("a peer's camera and the glide to it are not shared back", () => {
    expect(share.follow(B)).toBe(true);
    share.moved(A);
    share.moved(B);
    vi.advanceTimersByTime(FOLLOW_GLIDE_MS * 4);
    expect(shared).toEqual([]);
    expect(share.follow(B)).toBe(false);
  });

  test('a move of its own that ends within the glide is shared once the glide is over', () => {
    share.follow(B);
    share.moved(C);
    expect(shared).toEqual([]);
    vi.advanceTimersByTime(FOLLOW_GLIDE_MS * 2);
    expect(shared).toEqual([C]);
  });
});
