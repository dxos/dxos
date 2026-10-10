//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, test } from 'vitest';

import { WORK_MARK_PREFIX, absoluteNow, getWorkMarks, markWork, resetWorkMarks } from './work-marks.ts';

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

  test('filters by time and writes prefixed entries to the user timing timeline', ({ expect }) => {
    markWork('early');
    const cut = absoluteNow() + 1;
    while (absoluteNow() < cut) {}
    markWork('late', 'tools');
    expect(getWorkMarks(cut).map(({ name, detail }) => ({ name, detail }))).toEqual([
      { name: 'late', detail: 'tools' },
    ]);
    const entry = performance.getEntriesByName(`${WORK_MARK_PREFIX}late`, 'mark').at(-1);
    expect(entry && 'detail' in entry ? entry.detail : undefined).toEqual({ text: 'tools' });
  });

  test('leaves marks written by others alone', ({ expect }) => {
    performance.mark('other');
    markWork('ours');
    resetWorkMarks();
    expect(getWorkMarks()).toEqual([]);
    expect(performance.getEntriesByName('other', 'mark')).toHaveLength(1);
    performance.clearMarks('other');
  });

  test('stays bounded', ({ expect }) => {
    for (let index = 0; index < 20_000; index++) {
      markWork('tick');
    }
    markWork('last');
    const marks = getWorkMarks();
    expect(marks.length).toBeLessThanOrEqual(8_192);
    expect(marks.at(-1)?.name).toEqual('last');
    // Survivors keep their original times through a trim.
    expect(marks.every((mark, index) => index === 0 || mark.at >= marks[index - 1].at)).toBe(true);
  });
});
