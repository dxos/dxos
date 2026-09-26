//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import { invariant } from '@dxos/invariant';

import {
  MemoryTabHost,
  type Shape,
  TabNetwork,
  initialShape,
  randomEdit,
  seeded,
  unknownTo,
} from '../testing/index.ts';
import { decodeChange, saveNoCompress } from './automerge.ts';
import { encodeChange } from './encode.ts';
import { Model } from './model.ts';
import { readChange } from './reader.ts';
import { TabDoc } from './tab-doc.ts';

/** Byte values compare as arrays: `A.decodeChange` returns them as plain arrays. */
const plain = (value: unknown): unknown =>
  JSON.parse(JSON.stringify(value, (_key, inner) => (inner instanceof Uint8Array ? [...inner] : inner)));

/** A document with every value type Automerge has. */
type Values = {
  text: string;
  list: number[];
  float?: number;
  negative?: number;
  big?: number;
  uint?: A.Uint;
  int?: A.Int;
  float64?: A.Float64;
  when?: Date;
  nothing?: null;
  yes?: boolean;
  no?: boolean;
  bytes?: Uint8Array;
  counter?: A.Counter;
  empty?: string;
  scalar?: A.ImmutableString;
  nested?: { deeper: { list: (A.ImmutableString | { y: number })[] } };
};

/** Changes that write every value type Automerge has, from several actors, with conflicts. */
const everyValue = (): A.Doc<Values> => {
  let left = A.from<Values>({ text: 'hello 😀 world', list: [1, 2, 3] }, { actor: 'aaaa0000aaaa0000aaaa0000aaaa0000' });
  let right = A.clone(left, { actor: 'bbbb0000bbbb0000bbbb0000bbbb0000' });
  left = A.change(left, { message: 'types', time: 1_700_000_000 }, (doc) => {
    doc.float = 1.5;
    doc.negative = -42;
    doc.big = 2 ** 40;
    doc.uint = new A.Uint(7);
    doc.int = new A.Int(-7);
    doc.float64 = new A.Float64(3);
    doc.when = new Date(1_234_567_890_123);
    doc.nothing = null;
    doc.yes = true;
    doc.no = false;
    doc.bytes = new Uint8Array([0, 1, 255]);
    doc.counter = new A.Counter(10);
    doc.empty = '';
    doc.scalar = new A.ImmutableString('ünïcødé');
    doc.nested = { deeper: { list: [new A.ImmutableString('x'), { y: 1 }] } };
  });
  right = A.change(right, (doc) => {
    doc.float = 2.5;
    A.splice(doc, ['text'], 0, 5, 'HELLO');
    doc.list.splice(1, 1);
  });
  left = A.merge(left, right);
  left = A.change(left, (doc) => {
    // Overwrites both conflicting values, and increments the counter.
    doc.float = 3.5;
    invariant(doc.counter);
    doc.counter.increment(5);
    delete doc.nothing;
    doc.list.splice(0, 1, 9);
  });
  return left;
};

describe('Automerge formats read and written in JS', () => {
  test('the JS decoder reads every change as A.decodeChange does, and the encoder writes it back byte for byte', () => {
    const changes = A.getAllChanges(everyValue());
    // A fuzzed document adds text, lists, maps and conflicts from tabs and another peer.
    const random = seeded(7);
    const host = new MemoryTabHost();
    host.create('doc', initialShape());
    const network = new TabNetwork(host);
    const tabs = [network.open<Shape>('doc'), network.open<Shape>('doc')];
    let peer = A.clone(host.doc<Shape>('doc'), { actor: 'eeee0000eeee0000eeee0000eeee0000' });
    for (let step = 0; step < 60; step++) {
      tabs[random.pick(2)].tab.change(randomEdit(random));
      if (step % 10 === 0) {
        network.settle();
        peer = A.change(A.merge(peer, A.clone(host.doc('doc'))), (doc) => A.splice(doc, ['content'], 0, 0, 'P'));
        host.applyRemote('doc', unknownTo(host.doc('doc'), peer));
      }
    }
    network.settle();
    changes.push(...A.getAllChanges(host.doc('doc')));

    for (const bytes of changes) {
      const { end, ...read } = readChange(bytes);
      expect(end).toBe(bytes.length);
      expect(plain(read)).toEqual(plain(A.decodeChange(bytes)));
      expect(encodeChange(read).bytes).toEqual(bytes);
    }
    expect(changes.length).toBeGreaterThan(30);
  });

  test('a saved document read in JS yields the change hashes Automerge has, without being told them', () => {
    const doc = everyValue();
    const model = Model.fromSaved(saveNoCompress(doc));
    expect(model.changeHashes()).toEqual(A.getAllChanges(doc).map((bytes) => decodeChange(bytes).hash));
    // A byte changed in the saved document no longer produces its heads.
    const tampered = saveNoCompress(doc);
    tampered[tampered.length - 3] ^= 1;
    expect(() => Model.fromSaved(tampered)).toThrow();
  });

  test("a tab document's save is change chunks that Automerge loads to the same document and heads", () => {
    const tab = TabDoc.create<{ title: string; items: string[]; count?: number }>({ title: 'hostless', items: [] }, {});
    tab.change((draft) => {
      draft.items.push('a', 'b');
      draft.count = 1;
    });
    const chunks = tab.changesIn(tab.heads()).map((change) => encodeChange(change).bytes);
    const bytes = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
    chunks.reduce((offset, chunk) => {
      bytes.set(chunk, offset);
      return offset + chunk.length;
    }, 0);
    const loaded = A.load<{ title: string; items: string[]; count: number }>(bytes);
    expect(A.getHeads(loaded)).toEqual(tab.heads());
    expect(A.toJS(loaded)).toEqual({ title: 'hostless', items: ['a', 'b'], count: 1 });
    // And a tab loads it back, from change chunks or from Automerge's saved document.
    expect(TabDoc.load(bytes, {}).heads()).toEqual(tab.heads());
    expect(TabDoc.load(saveNoCompress(loaded), {}).doc()).toEqual(tab.doc());
  });
});
