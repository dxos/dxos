//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Session } from './session.ts';

describe('Session', () => {
  test('a deck recording gets one segment per slide visit, with its steps', ({ expect }) => {
    const session = new Session();
    expect(session.mark({ id: 'a', step: 0 }, 0)).toEqual({ closed: undefined, opened: 'a' });
    expect(session.mark({ id: 'a', step: 1 }, 4)).toEqual({});
    expect(session.mark({ id: 'b', step: 0 }, 10)).toEqual({
      closed: { id: 'a', start: 0, end: 10, steps: [{ step: 1, at: 4 }] },
      opened: 'b',
    });
    expect(session.mark({ id: 'a', step: 0 }, 15)).toMatchObject({ closed: { id: 'b' }, opened: 'a' });
    expect(session.finish(18)).toEqual({ id: 'a', start: 15, end: 18, steps: [] });
    expect(session.finish(19)).toBeUndefined();
  });

  test('a one-slide recording ends when the reader leaves the slide', ({ expect }) => {
    const session = new Session({ slideId: 'b' });
    expect(session.mark({ id: 'b', step: 0 }, 0)).toEqual({ closed: undefined, opened: 'b' });
    expect(session.mark({ id: 'c', step: 0 }, 7)).toEqual({
      closed: { id: 'b', start: 0, end: 7, steps: [] },
      done: true,
    });
  });

  test('a one-slide recording ignores other slides before its own', ({ expect }) => {
    const session = new Session({ slideId: 'b' });
    expect(session.mark({ id: 'a', step: 0 }, 0)).toEqual({ closed: undefined, done: false });
  });
});
