//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import { Mirror, MirrorTesting } from '@dxos/echo-protocol';

import { patchesToOps, toMirror } from './automerge-ops.ts';
import { DocumentSequencer, type SequencedDocument } from './document-sequencer.ts';

type ListDoc = { list: unknown[]; map: Record<string, unknown> };

/** The mirror a tab reaches by applying the ops for one absorbed diff, and the worker's own state. */
const absorb = (before: A.Doc<ListDoc>, after: A.Doc<ListDoc>) => {
  const ops = patchesToOps(A.diff(after, A.getHeads(before), A.getHeads(after)), after);
  return { mirror: Mirror.applyOps(toMirror(before), ops).root, expected: toMirror(after) };
};

describe('patchesToOps', () => {
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
    expect(Mirror.mirrorEquals(mirror, expected)).toBe(true);
    expect(Mirror.getAt(mirror, ['list'])).toEqual([
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
      const random = MirrorTesting.createRandom(seed);
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
      if (!Mirror.mirrorEquals(mirror, expected)) {
        failures.push(seed);
      }
    }
    expect(failures).toEqual([]);
  });
});

describe('DocumentSequencer.submit', () => {
  test('writes nothing of a batch that does not fit and still returns the absorbed entry', () => {
    let doc = A.from<{ log: string; list: string[] }>({ log: '', list: ['a'] });
    const target: SequencedDocument = {
      doc: () => doc,
      change: (callback, options) => {
        doc = A.change(doc, options, callback);
      },
    };
    const sequencer = new DocumentSequencer(A.getHeads(doc));
    // A change the sequencer has not absorbed yet, as from a network merge.
    doc = A.change(doc, (draft) => {
      A.insertAt(draft.list, 1, 'remote');
    });
    const batch: Mirror.Batch = {
      batchId: 'batch',
      baseVersion: 0,
      ops: [
        { type: 'splice', path: ['log'], index: 0, remove: 0, insert: 'X' },
        { type: 'put', path: ['list', 5], value: 'out of range' },
      ],
    };

    const first = sequencer.submit(target, 'tab', batch);
    expect(first.type).toBe('rejected');
    expect(first.entries.map((entry) => entry.version)).toEqual([1]);
    expect(doc.log).toBe('');

    // Resending cannot apply it either, and nothing is absorbed twice.
    const second = sequencer.submit(target, 'tab', batch);
    expect(second.type).toBe('rejected');
    expect(second.entries).toEqual([]);
    expect(doc.log).toBe('');
    expect(sequencer.version).toBe(1);
  });
});
