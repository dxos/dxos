//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { eventScale, timeScale } from './gantt-scale.ts';

const PAD = 10;
const STEP = 20;

describe('timeScale', () => {
  test('maps the range onto the padded width', ({ expect }) => {
    const scale = timeScale({ range: { start: 100, end: 200 }, width: 220, pad: PAD });
    expect(scale.at(100)).toBe(PAD);
    expect(scale.at(200)).toBe(210);
    expect(scale.at(150)).toBe(110);
    expect(scale.width).toBe(220);
  });

  test('an instantaneous range does not divide by zero', ({ expect }) => {
    const scale = timeScale({ range: { start: 100, end: 100 }, width: 220, pad: PAD });
    expect(scale.at(100)).toBe(PAD);
  });

  test('ticks thin out with the width, never below two', ({ expect }) => {
    const wide = timeScale({ range: { start: 0, end: 1_000 }, width: 800, pad: PAD });
    const narrow = timeScale({ range: { start: 0, end: 1_000 }, width: 120, pad: PAD });
    expect(wide.ticks).toHaveLength(5);
    expect(narrow.ticks).toHaveLength(2);
    expect(wide.ticks[0].at).toBe(PAD);
    expect(wide.ticks[4].at).toBe(790);
  });
});

describe('eventScale', () => {
  test('one step per event, whatever the gaps between them', ({ expect }) => {
    // The third event is a hundred times further from the second than the second is from the first;
    // on this axis that lull is one step like any other.
    const scale = eventScale({ times: [0, 10, 1_010], step: STEP, pad: PAD });
    expect(scale.at(0)).toBe(PAD);
    expect(scale.at(10)).toBe(30);
    expect(scale.at(1_010)).toBe(50);
  });

  test('out of order and duplicate instants land on the same units', ({ expect }) => {
    const scale = eventScale({ times: [1_010, 10, 0, 10], step: STEP, pad: PAD });
    expect([scale.at(0), scale.at(10), scale.at(1_010)]).toEqual([PAD, 30, 50]);
  });

  test('an instant between two events sits proportionally between their units', ({ expect }) => {
    const scale = eventScale({ times: [0, 100], step: STEP, pad: PAD });
    expect(scale.at(25)).toBe(15);
    expect(scale.at(50)).toBe(20);
  });

  test('an instant outside the events clamps to the nearest end', ({ expect }) => {
    const scale = eventScale({ times: [100, 200], step: STEP, pad: PAD });
    expect(scale.at(0)).toBe(PAD);
    expect(scale.at(10_000)).toBe(30);
  });

  test('the width is the events plus the headroom the next one will occupy', ({ expect }) => {
    expect(eventScale({ times: [0, 10, 20], step: STEP, pad: PAD }).width).toBe(2 * PAD + 3 * STEP);
    expect(eventScale({ times: [0, 10, 20], step: STEP, pad: PAD, headroom: 0 }).width).toBe(2 * PAD + 2 * STEP);
  });

  test('no events is a drawing with no axis rather than a division by zero', ({ expect }) => {
    const scale = eventScale({ times: [], step: STEP, pad: PAD });
    expect(scale.at(1_234)).toBe(PAD);
    expect(scale.ticks).toEqual([]);
    expect(scale.width).toBe(2 * PAD + STEP);
  });

  test('ticks are event ordinals, strided so their labels cannot collide', ({ expect }) => {
    // A step as wide as a label leaves room for one tick per event.
    expect(eventScale({ times: [0, 1, 2, 3, 4, 5], step: 40, pad: PAD }).ticks).toEqual([
      { at: PAD, label: '#1' },
      { at: PAD + 40, label: '#2' },
      { at: PAD + 80, label: '#3' },
      { at: PAD + 120, label: '#4' },
      { at: PAD + 160, label: '#5' },
      { at: PAD + 200, label: '#6' },
    ]);
    // Half that, and only every third event can carry one.
    expect(eventScale({ times: [0, 1, 2, 3, 4, 5], step: STEP, pad: PAD }).ticks).toEqual([
      { at: PAD, label: '#1' },
      { at: PAD + 3 * STEP, label: '#4' },
    ]);
  });

  test('a single event still labels itself', ({ expect }) => {
    expect(eventScale({ times: [7], step: STEP, pad: PAD }).ticks).toEqual([{ at: PAD, label: '#1' }]);
  });
});
