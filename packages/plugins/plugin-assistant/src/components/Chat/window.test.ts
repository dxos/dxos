//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { WINDOW_STEP, advanceWindow, initialWindow } from './window';

describe('feed window', () => {
  test('holds while the reader is away from the oldest loaded turn', ({ expect }) => {
    const window = initialWindow(10);
    expect(advanceWindow(window, { startIndex: 4, loaded: 10 })).toEqual(window);
    expect(advanceWindow(window, { startIndex: undefined, loaded: 10 })).toEqual(window);
  });

  test('grows when the reader reaches the oldest loaded turn', ({ expect }) => {
    const grown = advanceWindow(initialWindow(10), { startIndex: 0, loaded: 10 });
    expect(grown.size).toBe(10 + WINDOW_STEP);
    expect(grown.armed).toBe(false);
  });

  test('stops at the feed start, where the read comes back short', ({ expect }) => {
    const stopped = advanceWindow(initialWindow(10), { startIndex: 0, loaded: 7 });
    expect(stopped).toEqual({ size: 10, armed: false });
  });

  test('a short page spends the gesture, so later arrivals cannot grow the window', ({ expect }) => {
    // The feed's start came back short; messages that arrive afterwards lift `loaded` to the limit
    // while the reader has never left the oldest row, and must not be read as a new gesture.
    const stopped = advanceWindow(initialWindow(10), { startIndex: 0, loaded: 7 });
    expect(advanceWindow(stopped, { startIndex: 0, loaded: 10 })).toEqual(stopped);
  });

  test('one page per gesture, even if the reader stays on the first row', ({ expect }) => {
    const grown = advanceWindow(initialWindow(10), { startIndex: 0, loaded: 10 });
    // The page that answers the grow arrives with the reader still at the top; without the disarm
    // this would chain until the whole feed was read, which is what the window exists to avoid.
    const again = advanceWindow(grown, { startIndex: 0, loaded: grown.size });
    expect(again).toEqual(grown);
  });

  test('re-arms once the reader has left the oldest loaded turn', ({ expect }) => {
    const grown = advanceWindow(initialWindow(10), { startIndex: 0, loaded: 10 });
    const rearmed = advanceWindow(grown, { startIndex: 3, loaded: grown.size });
    expect(rearmed).toEqual({ size: grown.size, armed: true });

    const growsAgain = advanceWindow(rearmed, { startIndex: 0, loaded: rearmed.size });
    expect(growsAgain.size).toBe(grown.size + WINDOW_STEP);
  });
});
