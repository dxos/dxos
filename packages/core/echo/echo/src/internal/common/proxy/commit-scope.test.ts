//
// Copyright 2026 DXOS.org
//

import { describe, test, vi } from 'vitest';

import { afterCommit, beginCommit, runInCommit } from './commit-scope.ts';

describe('commit scope', () => {
  test('outside a commit a callback runs at once', ({ expect }) => {
    const calls: string[] = [];
    afterCommit(() => calls.push('ran'));
    expect(calls).toEqual(['ran']);
  });

  test('inside nested commits a callback runs once, after the outermost ends', ({ expect }) => {
    const calls: string[] = [];
    const callback = () => calls.push('flush');
    runInCommit(() => {
      runInCommit(() => {
        afterCommit(callback);
        afterCommit(callback);
      });
      calls.push('inner ended');
      afterCommit(callback);
    });
    calls.push('outer returned');
    expect(calls).toEqual(['inner ended', 'flush', 'outer returned']);
  });

  test('a callback that commits again runs that commit after its whole round', ({ expect }) => {
    const calls: string[] = [];
    const second = () => calls.push('second');
    const first = () => {
      calls.push('first');
      runInCommit(() => afterCommit(second));
      calls.push('first done');
    };
    const sibling = () => calls.push('sibling');
    runInCommit(() => {
      afterCommit(first);
      afterCommit(sibling);
    });
    expect(calls).toEqual(['first', 'first done', 'sibling', 'second']);
  });

  test('ending a commit twice ends it once', ({ expect }) => {
    const calls: string[] = [];
    const outer = beginCommit();
    const inner = beginCommit();
    inner();
    inner();
    afterCommit(() => calls.push('flush'));
    expect(calls).toEqual([]);
    outer();
    expect(calls).toEqual(['flush']);
  });

  test('a throwing callback neither stops the others nor throws from the write', ({ expect }) => {
    const deferred: (() => void)[] = [];
    const spy = vi.spyOn(globalThis, 'queueMicrotask').mockImplementation((callback) => {
      deferred.push(callback);
    });
    try {
      const calls: string[] = [];
      expect(() =>
        runInCommit(() => {
          afterCommit(() => {
            throw new Error('subscriber failed');
          });
          afterCommit(() => calls.push('after'));
        }),
      ).not.toThrow();
      expect(calls).toEqual(['after']);
      // Rethrown outside the commit, so it still surfaces as unhandled.
      expect(deferred).toHaveLength(1);
      expect(() => deferred[0]()).toThrow('subscriber failed');
    } finally {
      spy.mockRestore();
    }
  });
});
