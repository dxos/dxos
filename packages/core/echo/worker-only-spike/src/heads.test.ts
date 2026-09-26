//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import { describe, expect, test, vi } from 'vitest';

vi.mock('@automerge/automerge', async (importOriginal) =>
  (await import('./mocks.ts')).automergeFactory(importOriginal),
);
vi.mock('@dxos/automerge-proxy/Automerge', async (importOriginal) =>
  (await import('./mocks.ts')).proxyNamespaceFactory(importOriginal),
);

// eslint-disable-next-line import/first
import * as Draft from '@dxos/automerge-proxy/Draft';
// eslint-disable-next-line import/first
import { DXN, Key, Obj, Type } from '@dxos/echo';
// eslint-disable-next-line import/first
import { checkoutVersion, createObject, getObjectCore, initEchoReactiveObjectRootProxy } from '@dxos/echo-client';
// eslint-disable-next-line import/first
import { ObjectCore } from '@dxos/echo-client/internal';
// eslint-disable-next-line import/first
import { type DatabaseDirectory } from '@dxos/echo-protocol';
// eslint-disable-next-line import/first
import { invariant } from '@dxos/invariant';

// eslint-disable-next-line import/first
import { SpikeClientHandle } from './client-handle.ts';
// eslint-disable-next-line import/first
import { encodeChange } from './encode.ts';
// eslint-disable-next-line import/first
import { SpikeHost } from './host.ts';
// eslint-disable-next-line import/first
import { leaks } from './namespace.ts';
// eslint-disable-next-line import/first
import { Network, type Tab } from './network.ts';
// eslint-disable-next-line import/first
import { type HostMessage } from './tab.ts';
// eslint-disable-next-line import/first
import { type Shape, canon, initialShape, randomEdit, seeded, unknownTo } from './testing.ts';

const Task = Schema.Struct({ title: Schema.String, status: Schema.String }).pipe(
  Type.makeObject(DXN.make('com.example.test.task', '0.1.0')),
);

const hashes = (doc: A.Doc<unknown>): string[] => A.getAllChanges(doc).map((change) => A.decodeChange(change).hash);

describe('heads read right after a write', () => {
  test('are the hash of the change just written, and the worker ends up with exactly those heads', () => {
    leaks.length = 0;
    const host = new SpikeHost();
    host.create('doc', { content: 'hello', title: new A.ImmutableString('t') });
    const network = new Network(host);
    const left = network.open<Shape>('doc');
    const right = network.open<Shape>('doc');

    left.handle.change((draft) => Draft.splice(draft, ['content'], 5, 0, ' world'));
    const heads = A.getHeads(left.handle.doc());
    expect(heads).toEqual([left.tab.pending[0].hash]);
    expect(heads[0]).toMatch(/^[0-9a-f]{64}$/);
    // Nothing has been delivered yet.
    expect(A.hasHeads(host.doc('doc'), heads)).toBe(false);
    expect(right.tab.hasHeads(heads)).toBe(false);

    network.settle();
    expect(A.getHeads(host.doc('doc'))).toEqual(heads);
    expect(A.getHeads(right.handle.doc())).toEqual(heads);
    const atHeads = canon(A.toJS(A.view(host.doc('doc'), heads)));
    expect(canon(left.tab.view(heads))).toBe(atHeads);
    expect(canon(right.tab.view(heads))).toBe(atHeads);
    // The worker exports the change under the same hash, so a save round-trips and peers can reach it.
    expect(A.getHeads(A.load(A.save(host.doc('doc'))))).toEqual(heads);
    expect(leaks).toEqual([]);
  });

  test("an ECHO object's version right after an update is final in the tab, the worker and other tabs", () => {
    leaks.length = 0;
    // The worker holds the database document; the tab binds an unmodified ObjectCore to it.
    const source = createObject(Obj.make(Task, { title: 'Write spike', status: 'todo' }));
    const id = getObjectCore(source).id;
    const host = new SpikeHost();
    host.create('db', { objects: { [id]: A.toJS(getObjectCore(source).getDoc()) } });
    const network = new Network(host);
    const tab = network.open<DatabaseDirectory>('db');
    const core = new ObjectCore();
    core.id = id;
    core.bind({
      db: { spaceId: Key.SpaceId.random(), getObjectCoreById: () => undefined },
      docHandle: new SpikeClientHandle(tab.tab),
      path: ['objects', id],
    });
    const task = initEchoReactiveObjectRootProxy(core);
    invariant(Obj.instanceOf(Task, task));
    expect(task.status).toBe('todo');

    Obj.update(task, (task) => {
      task.status = 'done';
    });
    const version = Obj.version(task);
    expect(version.versioned).toBe(true);
    expect(version.automergeHeads).toEqual(tab.tab.heads());
    expect(version.automergeHeads).toEqual([tab.tab.pending[0].hash]);
    const heads = version.automergeHeads ?? [];
    expect(checkoutVersion(task, heads)).toMatchObject({ id, title: 'Write spike', status: 'done' });

    network.settle();
    expect(A.getHeads(host.doc('db'))).toEqual(heads);
    expect(A.view(host.doc<DatabaseDirectory>('db'), heads).objects?.[id].data.status).toBe('done');
    const later = network.open<DatabaseDirectory>('db');
    expect(later.tab.view(heads).objects?.[id].data.status).toBe('done');
    expect(leaks).toEqual([]);
  });

  test('every version a tab reads right after a write, over random concurrent edits, is one the worker has', () => {
    for (const seed of [11, 12, 13, 14]) {
      const random = seeded(seed);
      const { rand, pick } = random;
      const host = new SpikeHost();
      host.create('doc', initialShape());
      const network = new Network(host);
      const tabs: Tab<Shape>[] = [network.open<Shape>('doc'), network.open<Shape>('doc'), network.open<Shape>('doc')];
      let peer = A.clone(host.doc<Shape>('doc'), { actor: 'eeee0000eeee0000eeee0000eeee0000' });
      const versions: { heads: string[]; state: string }[] = [];
      const written = new Set<string>();

      for (let step = 0; step < 100; step++) {
        const roll = rand();
        if (roll < 0.6) {
          const tab = tabs[pick(tabs.length)];
          const heads = tab.tab.change(randomEdit(random));
          if (heads) {
            written.add(heads[0]);
            versions.push({ heads: A.getHeads(tab.handle.doc()), state: canon(tab.handle.doc()) });
          }
        } else if (roll < 0.7) {
          peer = A.change(peer, (draft) => {
            draft.title = new A.ImmutableString(`peer ${step}`);
          });
        } else if (roll < 0.8) {
          host.applyRemote('doc', unknownTo(host.doc('doc'), peer));
        } else if (roll < 0.85) {
          host.flush();
          peer = A.merge(peer, A.clone(host.doc<Shape>('doc')));
        } else {
          network.deliver(1 + pick(network.pending + 1));
        }
      }
      network.settle();

      const doc = host.doc('doc');
      for (const { heads, state } of versions) {
        expect(A.hasHeads(doc, heads)).toBe(true);
        expect(canon(A.toJS(A.view(doc, heads)))).toBe(state);
        for (const tab of tabs) {
          expect(canon(tab.tab.view(heads))).toBe(state);
        }
      }
      // Every change a tab wrote is exported under the hash its heads carried.
      const exported = new Set(hashes(A.load(A.save(doc))));
      expect([...written].filter((hash) => !exported.has(hash))).toEqual([]);
      expect(versions.length).toBeGreaterThan(40);
    }
  });
});

describe('the protocol behind real heads', () => {
  test('the worker refuses bytes that are not canonical; Automerge would index and export them under different hashes', () => {
    const host = new SpikeHost();
    host.create('doc', { title: new A.ImmutableString('t') });
    const network = new Network(host);
    const left = network.open<Shape>('doc');
    const right = network.open<Shape>('doc');
    left.handle.change((draft) => {
      draft.title = new A.ImmutableString('left');
    });
    right.handle.change((draft) => {
      draft.title = new A.ImmutableString('right');
    });
    network.settle();

    // Overwriting both conflicting values gives an op with two preds.
    left.handle.change((draft) => {
      draft.title = new A.ImmutableString('merged');
    });
    const change = left.tab.pending[0];
    expect(change.ops[0].pred).toHaveLength(2);
    const reversed = { ...change, ops: change.ops.map((op) => ({ ...op, pred: [...op.pred].reverse() })) };
    const { bytes, hash } = encodeChange(reversed, { predOrder: 'given' });
    expect(hash).not.toBe(change.hash);

    const messages: HostMessage[] = [];
    host.subscribe('doc', 'probe', (message) => messages.push(message));
    host.submit('doc', 'probe', { ...change, hash }, bytes);
    expect(messages).toEqual([{ type: 'refuse', hash, reason: 'not canonically encoded' }]);

    // Without the check: the heads name one hash, the exported change another, and the save does not load.
    const [poisoned] = A.applyChanges(A.clone(host.doc('doc')), [bytes]);
    expect(A.getHeads(poisoned)).toEqual([hash]);
    expect(hashes(poisoned)).not.toContain(hash);
    expect(() => A.load(A.save(poisoned))).toThrow(/mismatching heads/);

    // The tab's own canonical bytes go through.
    network.settle();
    expect(A.getHeads(host.doc('doc'))).toEqual([change.hash]);
    expect(A.getHeads(A.load(A.save(host.doc('doc'))))).toEqual([change.hash]);
  });

  test('refusals name changes by hash, so a late refusal cannot drop a later change that reused the seq', () => {
    const host = new SpikeHost();
    host.create('doc', { content: 'abc' });
    const network = new Network(host);
    const tab = network.open<Shape>('doc');
    const rejected: string[][] = [];
    tab.tab.onRejected((changes) => rejected.push(changes.map((change) => change.hash)));
    let refuseNext = true;
    host.refuseWhen = () => {
      const refuse = refuseNext;
      refuseNext = false;
      return refuse;
    };

    const [first] = tab.tab.change((draft) => Draft.splice(draft, ['content'], 3, 0, '1')) ?? [];
    const [second] = tab.tab.change((draft) => Draft.splice(draft, ['content'], 4, 0, '2')) ?? [];
    network.deliver(2); // The worker refuses the first, then the second for depending on it.
    network.deliver(1); // The tab takes the first refusal and drops both.
    expect(rejected).toEqual([[first, second]]);
    expect(tab.handle.doc().content).toBe('abc');

    // Two new changes reuse seqs 1 and 2 before the second refusal arrives.
    const [third] = tab.tab.change((draft) => Draft.splice(draft, ['content'], 0, 0, 'x')) ?? [];
    const [fourth] = tab.tab.change((draft) => Draft.splice(draft, ['content'], 0, 0, 'y')) ?? [];
    expect(tab.tab.pending.map((change) => change.seq)).toEqual([1, 2]);
    network.deliver(1); // The late refusal of `second` (seq 2) matches nothing.
    expect(tab.tab.pending.map((change) => change.hash)).toEqual([third, fourth]);

    network.settle();
    expect(tab.tab.pending).toHaveLength(0);
    expect(host.doc<Shape>('doc').content).toBe('yxabc');
    expect(tab.handle.doc().content).toBe('yxabc');
    expect(A.getHeads(host.doc('doc'))).toEqual([fourth]);
    expect(rejected).toHaveLength(1);
  });
});
