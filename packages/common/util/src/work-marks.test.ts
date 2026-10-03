//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, test } from 'vitest';

import { WORK_MARKS_GLOBAL, absoluteNow, getWorkMarks, markWork, resetWorkMarks } from './work-marks.ts';

describe('work marks', () => {
  beforeEach(() => {
    resetWorkMarks();
  });

  test('records named instants in order on the absolute clock', ({ expect }) => {
    const before = absoluteNow();
    markWork('chat.submit', 'chat-1');
    markWork('ai.request');
    const marks = getWorkMarks();
    expect(marks.map(({ name, detail }) => ({ name, detail }))).toEqual([
      { name: 'chat.submit', detail: 'chat-1' },
      { name: 'ai.request', detail: undefined },
    ]);
    expect(marks[0].at).toBeGreaterThanOrEqual(before);
    expect(marks[1].at).toBeGreaterThanOrEqual(marks[0].at);
    expect(Math.abs(marks[0].at - Date.now())).toBeLessThan(1_000);
  });

  test('filters by time and publishes a reader on the global', ({ expect }) => {
    markWork('early');
    const cut = absoluteNow() + 1;
    while (absoluteNow() < cut) {}
    markWork('late');
    const read: unknown = Reflect.get(globalThis, WORK_MARKS_GLOBAL);
    expect(typeof read === 'function' ? read(cut).map(({ name }: { name: string }) => name) : undefined).toEqual([
      'late',
    ]);
  });

  test('stays bounded', ({ expect }) => {
    for (let index = 0; index < 20_000; index++) {
      markWork('tick');
    }
    expect(getWorkMarks().length).toBeLessThanOrEqual(4_096);
  });
});
