//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Take from '../types/Take.ts';
import { Timeline } from './timeline.ts';

describe('Timeline', () => {
  test('one section per slide visit, steps logged', ({ expect }) => {
    const timeline = new Timeline();
    timeline.mark({ id: 'a', title: 'Intro', step: 0 }, 0);
    timeline.mark({ id: 'a', step: 1 }, 4);
    timeline.mark({ id: 'a', step: 1 }, 5);
    timeline.mark({ id: 'b', step: 0 }, 10);
    timeline.mark({ id: 'a', step: 0 }, 15);
    const log = timeline.finish(18);

    expect(log.duration).toBe(18);
    expect(log.sections).toEqual([
      { id: 'a', title: 'Intro', start: 0, end: 10 },
      { id: 'b', start: 10, end: 15 },
      { id: 'a', start: 15, end: 18 },
    ]);
    expect(log.steps).toEqual([{ id: 'a', step: 1, at: 4 }]);
    expect(Take.summarize(log)).toEqual([
      { id: 'a', title: 'Intro', seconds: 13 },
      { id: 'b', title: undefined, seconds: 5 },
    ]);
    expect(Take.slideSeconds(log)).toEqual(
      new Map([
        ['a', 13],
        ['b', 5],
      ]),
    );
  });

  test('a title that resolves after the slide shows', ({ expect }) => {
    const timeline = new Timeline();
    timeline.mark({ id: 'a', step: 0 }, 0);
    timeline.mark({ id: 'a', title: 'Intro', step: 0 }, 0.1);
    expect(timeline.finish(1).sections).toEqual([{ id: 'a', title: 'Intro', start: 0, end: 1 }]);
  });

  test('a take with no slides', ({ expect }) => {
    expect(new Timeline().finish(3)).toEqual({ sections: [], steps: [], duration: 3 });
  });

  test('the log round-trips through a Variant config', ({ expect }) => {
    const timeline = new Timeline();
    timeline.mark({ id: 'a', step: 0 }, 0);
    const log: Take.Log = { ...timeline.finish(2), source: 'none', device: 'Shure MV7' };
    expect(Take.fromConfig(JSON.parse(JSON.stringify(log)))).toEqual(log);
    expect(Take.fromConfig({ prompt: 'not a take' })).toBeUndefined();
  });
});
