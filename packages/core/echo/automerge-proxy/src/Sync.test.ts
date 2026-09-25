//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Op from './Op.ts';
import * as Sync from './Sync.ts';

/** An op no document fits, so the worker refuses the change that holds it. */
const POISON: Op.Any = { type: 'put', path: ['missing', 'key'], value: 1 };

/** A tab with one batch in flight, and the sequencer that ordered its base. */
const setup = (value: unknown) => {
  const tab = new Sync.ClientState('tab', Op.freeze(value), 0, []);
  const sequencer = new Sync.Sequencer();
  return { tab, sequencer };
};

/** The entry a worker appends when it wrote the changes before `refusedAt` and refused that one. */
const refusal = (sequencer: Sync.Sequencer, batchId: string, ops: Op.Any[], refusedAt: number): Sync.Entry =>
  sequencer.append({ ops, heads: [], origin: { clientId: 'tab', batchId, refusedAt } });

describe('Sync.ClientState refusals', () => {
  test('the worker refusing the middle of three changes takes back only that one', () => {
    const { tab, sequencer } = setup({ a: 'x', b: 'x', c: 'x' });
    const first: Op.Any[] = [{ type: 'put', path: ['a'], value: 'A' }];
    const middle: Op.Any[] = [{ type: 'put', path: ['b'], value: 'B' }, POISON];
    const last: Op.Any[] = [{ type: 'put', path: ['c'], value: 'C' }];
    tab.applyLocal(first);
    tab.applyLocal(middle);
    tab.applyLocal(last);
    const batch = tab.takeBatch('batch');
    expect(batch?.changes).toHaveLength(3);

    const result = tab.receive(refusal(sequencer, 'batch', first, 1));
    expect(result.acknowledged).toBe(true);
    expect(result.rebuilt).toBe(false);
    expect(result.refused).toEqual([middle]);
    expect(result.patches).toEqual([{ action: 'put', path: ['b'], value: 'x' }]);
    expect(tab.current).toEqual({ a: 'A', b: 'x', c: 'C' });
    expect(tab.confirmed).toEqual({ a: 'A', b: 'x', c: 'x' });
    // The change after the refused one goes out again in the next batch.
    expect(tab.takeBatch('next')?.changes).toEqual([last]);
  });

  test('text typed after refused text keeps its place', () => {
    const { tab, sequencer } = setup({ text: 'hello' });
    tab.applyLocal([{ type: 'splice', path: ['text'], index: 5, remove: 0, insert: ' world' }, POISON]);
    tab.applyLocal([{ type: 'splice', path: ['text'], index: 11, remove: 0, insert: '!' }]);
    tab.takeBatch('batch');
    // Typed while the batch was in flight.
    tab.applyLocal([{ type: 'splice', path: ['text'], index: 0, remove: 0, insert: '> ' }]);

    const { refused } = tab.receive(refusal(sequencer, 'batch', [], 0));
    expect(refused).toHaveLength(1);
    expect(tab.current).toEqual({ text: '> hello!' });
    expect(tab.takeBatch('next')?.changes).toEqual([
      [{ type: 'splice', path: ['text'], index: 5, remove: 0, insert: '!' }],
      [{ type: 'splice', path: ['text'], index: 0, remove: 0, insert: '> ' }],
    ]);
  });

  test('a later delete of what the refused change wrote stays deleted', () => {
    const { tab, sequencer } = setup({ map: { key: 'old' }, list: ['a', 'b'] });
    tab.applyLocal([
      { type: 'put', path: ['map', 'key'], value: 'new' },
      { type: 'put', path: ['list', 0], value: 'A' },
      POISON,
    ]);
    tab.applyLocal([
      { type: 'del', path: ['map', 'key'] },
      { type: 'remove', path: ['list', 0], count: 1 },
    ]);
    tab.takeBatch('batch');

    const { refused } = tab.receive(refusal(sequencer, 'batch', [], 0));
    expect(refused).toHaveLength(1);
    expect(tab.current).toEqual({ map: {}, list: ['b'] });
  });

  test('a change that only made sense on top of the refused one is refused with it', () => {
    const { tab, sequencer } = setup({ items: [] });
    const insert: Op.Any[] = [{ type: 'insert', path: ['items', 0], values: [{ title: 'new' }] }, POISON];
    const edit: Op.Any[] = [{ type: 'splice', path: ['items', 0, 'title'], index: 3, remove: 0, insert: '!' }];
    tab.applyLocal(insert);
    tab.applyLocal(edit);
    tab.takeBatch('batch');

    const { refused } = tab.receive(refusal(sequencer, 'batch', [], 0));
    expect(refused).toEqual([insert, edit]);
    expect(tab.current).toEqual({ items: [] });
    expect(tab.hasPending).toBe(false);
  });

  test('changes other writers emptied still count toward the refused index', () => {
    const { tab, sequencer } = setup({ map: { key: { title: 'x' } }, other: 'x' });
    const emptied: Op.Any[] = [{ type: 'put', path: ['map', 'key', 'title'], value: 'y' }];
    const refused: Op.Any[] = [{ type: 'put', path: ['other', 'deep'], value: 1 }];
    tab.applyLocal(emptied);
    tab.applyLocal(refused);
    tab.takeBatch('batch');
    // Another writer deletes the value the first change edits inside; the batch keeps two changes.
    tab.receive(sequencer.append({ ops: [{ type: 'del', path: ['map', 'key'] }], heads: [] }));
    expect(tab.inflight?.changes).toEqual([[], refused]);

    const result = tab.receive(refusal(sequencer, 'batch', [], 1));
    expect(result.refused).toEqual([refused]);
    expect(tab.current).toEqual({ map: {}, other: 'x' });
  });

  test('a snapshot that contains part of the in-flight batch replays the rest', () => {
    const { tab } = setup({ a: 'x', b: 'x', c: 'x' });
    tab.applyLocal([{ type: 'put', path: ['a'], value: 'A' }]);
    tab.applyLocal([{ type: 'put', path: ['b'], value: 'B' }, POISON]);
    tab.applyLocal([{ type: 'put', path: ['c'], value: 'C' }]);
    tab.takeBatch('batch');

    const { refused } = tab.reset(Op.freeze({ a: 'A', b: 'x', c: 'x', d: 'remote' }), 7, ['h7'], true, 1);
    expect(refused).toEqual([[{ type: 'put', path: ['b'], value: 'B' }, POISON]]);
    expect(tab.current).toEqual({ a: 'A', b: 'x', c: 'C', d: 'remote' });
    expect(tab.version).toBe(7);
    expect(tab.takeBatch('next')?.changes).toEqual([[{ type: 'put', path: ['c'], value: 'C' }]]);
  });

  test('a snapshot keeps a change that does not fit it, for the worker to judge', () => {
    const { tab } = setup({ list: ['a', 'b', 'c'] });
    const change: Op.Any[] = [
      { type: 'put', path: ['title'], value: 'shown' },
      { type: 'remove', path: ['list', 2], count: 1 },
    ];
    tab.applyLocal(change);

    const { refused } = tab.reset(Op.freeze({ list: ['a'] }), 3, ['h3']);
    expect(refused).toEqual([]);
    expect(tab.current).toEqual({ list: ['a'], title: 'shown' });
    expect(tab.takeBatch('next')?.changes).toEqual([change]);
  });
});
