//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import * as Op from '../Op.ts';
import * as Sync from '../Sync.ts';
import { createRandom } from '../testing/index.ts';
import * as AutomergeOps from './AutomergeOps.ts';
import * as Sequencing from './Sequencing.ts';

type ListDoc = { list: unknown[]; map: Record<string, unknown> };

/** The mirror a tab reaches by applying the ops for one absorbed diff, and the worker's own state. */
const absorb = (before: A.Doc<ListDoc>, after: A.Doc<ListDoc>) => {
  const ops = AutomergeOps.patchesToOps(A.diff(after, A.getHeads(before), A.getHeads(after)), after);
  return { mirror: Op.apply(AutomergeOps.toValue(before), ops).root, expected: AutomergeOps.toValue(after) };
};

describe('AutomergeOps.patchesToOps', () => {
  test('a new text next to a RawString inserted before it stays a text', () => {
    const before = A.from<ListDoc>({
      list: [new A.RawString('a'), new A.RawString('b'), new A.RawString('c')],
      map: {},
    });
    const after = A.change(A.clone(before), (doc) => {
      doc.list[2] = 'text';
      A.insertAt(doc.list, 0, new A.RawString('x'));
      A.insertAt(doc.list, 3, 'inserted');
      A.insertAt(doc.list, 0, new A.RawString('y'));
    });
    const { mirror, expected } = absorb(before, after);
    expect(Op.equals(mirror, expected)).toBe(true);
    expect(Op.getAt(mirror, ['list'])).toEqual([
      new A.RawString('y'),
      new A.RawString('x'),
      new A.RawString('a'),
      new A.RawString('b'),
      'inserted',
      'text',
    ]);
  });

  // Random changes over lists mixing RawStrings, texts, maps and numbers, including text edits inside
  // list elements whose index shifts later in the same diff.
  test('matches Automerge on random diffs', () => {
    const failures: number[] = [];
    for (let seed = 1; seed <= 2_000; seed++) {
      const random = createRandom(seed);
      const value = (): unknown =>
        random.pick([
          () => new A.RawString(`r${random.int(100)}`),
          () => `t${random.int(100)}`,
          () => ({ title: `n${random.int(9)}` }),
          () => [`a${random.int(9)}`, `b${random.int(9)}`],
          () => random.int(9),
        ])();
      const edit = (doc: ListDoc) => {
        for (let step = 0; step < 2 + random.int(4); step++) {
          const index = random.int(doc.list.length + 1);
          const element = doc.list[index];
          switch (random.int(5)) {
            case 0:
              A.insertAt(doc.list, index, value());
              break;
            case 1:
              if (index < doc.list.length) {
                A.deleteAt(doc.list, index);
              }
              break;
            case 2:
              if (index < doc.list.length) {
                doc.list[index] = value();
              }
              break;
            case 3:
              if (typeof element === 'string' && element.length > 0) {
                const at = random.int(element.length);
                A.splice(doc, ['list', index], at, random.int(2), random.pick(['', 'Q']));
              }
              break;
            default:
              doc.map[random.pick(['a', 'b', 'c'])] = value();
          }
        }
      };
      let doc = A.from<ListDoc>({ list: [value(), value(), value(), value()], map: { text: 'text' } });
      doc = A.change(doc, edit);
      const after = A.change(A.clone(doc), edit);
      const { mirror, expected } = absorb(doc, after);
      if (!Op.equals(mirror, expected)) {
        failures.push(seed);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('Sequencing.DocumentSequencer.submit', () => {
  type Doc = { log: string; list: string[]; map: Record<string, unknown> };

  /** A document with one change the sequencer has not absorbed yet, as from a network merge. */
  const setup = () => {
    let doc = A.from<Doc>({ log: '', list: ['a'], map: {} });
    const target: Sequencing.SequencedDocument = {
      doc: () => doc,
      change: (callback, options) => {
        doc = A.change(doc, options, callback);
      },
    };
    const sequencer = new Sequencing.DocumentSequencer(A.getHeads(doc));
    doc = A.change(doc, (draft) => {
      A.insertAt(draft.list, 1, 'remote');
    });
    return { sequencer, target, doc: () => doc };
  };

  const append = (index: number, text: string): Op.Any => ({
    type: 'splice',
    path: ['log'],
    index,
    remove: 0,
    insert: text,
  });

  test('writes the changes before one that does not fit and none after', () => {
    const { sequencer, target, doc } = setup();
    const batch: Sync.Batch = {
      batchId: 'batch',
      baseVersion: 0,
      changes: [
        [append(0, 'X')],
        [append(1, 'Y'), { type: 'put', path: ['list', 5], value: 'out of range' }],
        [append(1, 'Z')],
      ],
    };

    const result = sequencer.submit(target, 'tab', batch);
    expect(result.type === 'applied' && result.refused?.index).toBe(1);
    expect(result.entries.map((entry) => entry.origin)).toEqual([
      undefined,
      { clientId: 'tab', batchId: 'batch', refusedAt: 1 },
    ]);
    expect(result.entries[1].ops).toEqual([append(0, 'X')]);
    expect(doc().log).toBe('X');
    // Recorded in the change message, so a restarted worker can tell where the batch stopped.
    expect(Sequencing.DocumentSequencer.findBatch(doc(), 'batch')).toEqual({
      clientId: 'tab',
      batchId: 'batch',
      refusedAt: 1,
    });
    expect(Sequencing.DocumentSequencer.recover(doc(), [...result.entries[0].heads])?.[0].origin).toEqual({
      clientId: 'tab',
      batchId: 'batch',
      refusedAt: 1,
    });
  });

  test('refuses a change holding a value Automerge refuses', () => {
    const { sequencer, target, doc } = setup();
    const result = sequencer.submit(target, 'tab', {
      batchId: 'batch',
      baseVersion: 0,
      changes: [[append(0, 'X'), { type: 'put', path: ['map', 'key'], value: new Map() }]],
    });
    expect(result.type === 'applied' && result.refused?.error.message).toMatch(/unknown object/);
    expect(result.entries.at(-1)?.origin).toEqual({ clientId: 'tab', batchId: 'batch', refusedAt: 0 });
    expect(result.entries.at(-1)?.ops).toEqual([]);
    // Nothing was written, so no change carries the batch.
    expect(doc().log).toBe('');
    expect(Sequencing.DocumentSequencer.findBatch(doc(), 'batch')).toBeUndefined();
  });

  test('refuses a change holding a malformed op whole', () => {
    const { sequencer, target, doc } = setup();
    const result = sequencer.submit(target, 'tab', {
      batchId: 'batch',
      baseVersion: 0,
      changes: [[append(0, 'X')], [append(1, 'Y'), { type: 'unknown', path: ['log'] }], [append(1, 'Z')]],
    });
    expect(result.type === 'applied' && result.refused?.index).toBe(1);
    expect(doc().log).toBe('X');
    expect(Sequencing.DocumentSequencer.findBatch(doc(), 'batch')).toEqual({
      clientId: 'tab',
      batchId: 'batch',
      refusedAt: 1,
    });
  });

  test('writes every change of a batch that fits as one Automerge change', () => {
    const { sequencer, target, doc } = setup();
    const heads = A.getHeads(doc());
    const result = sequencer.submit(target, 'tab', {
      batchId: 'batch',
      baseVersion: 0,
      changes: [[append(0, 'X')], [], [append(1, 'Y')]],
    });
    expect(result.type === 'applied' && result.refused).toBeUndefined();
    expect(result.entries.at(-1)?.origin).toEqual({ clientId: 'tab', batchId: 'batch' });
    expect(doc().log).toBe('XY');
    expect(A.getChangesMetaSince(doc(), heads)).toHaveLength(1);
  });
});
