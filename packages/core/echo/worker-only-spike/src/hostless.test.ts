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
import { DXN, Key, Obj, Type } from '@dxos/echo';
// eslint-disable-next-line import/first
import { createObject, getObjectCore } from '@dxos/echo-client';
// eslint-disable-next-line import/first
import { ObjectCore, migrateDocument } from '@dxos/echo-client/internal';
// eslint-disable-next-line import/first
import { AddOnlySet } from '@dxos/echo-doc';
// eslint-disable-next-line import/first
import { invariant } from '@dxos/invariant';

// eslint-disable-next-line import/first
import { SpikeClientHandle } from './client-handle.ts';
// eslint-disable-next-line import/first
import { SpikeHost } from './host.ts';
// eslint-disable-next-line import/first
import { asTab, leaks } from './namespace.ts';
// eslint-disable-next-line import/first
import { Network } from './network.ts';
// eslint-disable-next-line import/first
import { tagOf } from './tab.ts';
// eslint-disable-next-line import/first
import { canon } from './testing.ts';

const Task = Schema.Struct({ title: Schema.String, status: Schema.String }).pipe(
  Type.makeObject(DXN.make('com.example.test.task', '0.1.0')),
);

type Notes = { title: string; items: string[]; done?: boolean };

const binding = { spaceId: Key.SpaceId.random(), getObjectCoreById: () => undefined };

describe('documents a tab makes with no worker behind them', () => {
  test('from, change, changeAt, clone, merge and save answer from the model; the worker loads what save gives', () => {
    leaks.length = 0;
    const { doc, other, saved, heads } = asTab(() => {
      let doc = A.from<Notes>({ title: 'Notes', items: ['a'] });
      doc = A.change(doc, { message: 'add b' }, (draft) => {
        draft.items.push('b');
      });
      const base = A.getHeads(doc);
      let other = A.clone(doc, { actor: 'cccc0000cccc0000cccc0000cccc0000' });
      other = A.change(other, (draft) => {
        draft.done = true;
      });
      const { newDoc } = A.changeAt(doc, base, (draft) => {
        draft.items.unshift('z');
      });
      doc = A.merge(newDoc, other);
      return { doc, other, saved: A.save(doc), heads: A.getHeads(doc) };
    });
    expect(tagOf(doc)).toBeDefined();
    expect(A.getActorId(other)).toBe('cccc0000cccc0000cccc0000cccc0000');
    expect(A.toJS(doc)).toEqual({ title: 'Notes', items: ['z', 'a', 'b'], done: true });
    expect(heads).toHaveLength(2);

    // The worker's Automerge loads the tab's bytes to the same document and heads.
    const loaded = A.load<Notes>(saved);
    expect(tagOf(loaded)).toBeUndefined();
    expect(A.getHeads(loaded)).toEqual(heads);
    expect(canon(A.toJS(loaded))).toBe(canon(A.toJS(doc)));
    expect(A.getHistory(loaded).map((state) => state.change.message)).toEqual(
      A.getHistory(doc).map((state) => state.change.message),
    );
    const last = A.getLastLocalChange(doc);
    invariant(last);
    expect(A.getHeads(loaded)).toContain(A.decodeChange(last).hash);
    expect(leaks).toEqual([]);
  });

  test('an ECHO object made in a tab lives in a tab document, versions with real heads, and moves into a database', () => {
    leaks.length = 0;
    const task = asTab(() => createObject(Obj.make(Task, { title: 'Draft', status: 'todo' })));
    const core = getObjectCore(task);
    expect(tagOf(core.getDoc())).toBeDefined();
    Obj.update(task, (task) => {
      task.status = 'doing';
    });
    const version = Obj.version(task);
    expect(version.versioned).toBe(true);
    expect(version.automergeHeads).toEqual(A.getHeads(core.getDoc()));

    // Adding it to a database copies its value into the database's document, as with a replica.
    const host = new SpikeHost();
    host.create('db', { objects: {} });
    const network = new Network(host);
    const tab = network.open('db');
    core.bind({
      db: binding,
      docHandle: new SpikeClientHandle(tab.tab),
      path: ['objects', core.id],
      assignFromLocalState: true,
    });
    Obj.update(task, (task) => {
      task.title = 'Final';
    });
    network.settle();
    const stored = A.toJS(host.doc('db')).objects[core.id];
    expect(stored.data).toEqual({ title: 'Final', status: 'doing' });
    expect(Obj.version(task).automergeHeads).toEqual(A.getHeads(host.doc('db')));
    expect(leaks).toEqual([]);
  });
});

describe('ECHO functions that needed a replica, unmodified over tab documents', () => {
  test("getUpdatedAt reads change times from the tab's model", () => {
    leaks.length = 0;
    const host = new SpikeHost();
    host.create('doc', { objects: { one: { data: { title: 'x' }, meta: { keys: [] }, system: {} } } });
    const network = new Network(host);
    const tab = network.open('doc');
    tab.tab.change(
      (draft: { objects: { one: { data: { title: string } } } }) => {
        draft.objects.one.data.title = 'y';
      },
      { time: 1_800_000_000 },
    );
    network.settle();
    const spike = new ObjectCore();
    spike.bind({ db: binding, docHandle: new SpikeClientHandle(tab.tab), path: ['objects', 'one'] });
    const real = new ObjectCore();
    real.doc = host.doc('doc');
    real.mountPath = ['objects', 'one'];
    expect(spike.getUpdatedAt()).toBe(1_800_000_000_000);
    expect(spike.getUpdatedAt()).toBe(real.getUpdatedAt());
    expect(leaks).toEqual([]);
  });

  test("AddOnlySet.read walks the tab's changes as it walks Automerge's", () => {
    leaks.length = 0;
    const host = new SpikeHost();
    host.create('doc', { set: {} });
    const network = new Network(host);
    const left = network.open('doc');
    const right = network.open('doc');
    const bytes = (text: string) => new TextEncoder().encode(text);
    left.tab.change((draft: { set: AddOnlySet.Entries }) => {
      AddOnlySet.add(draft.set, 'k1', bytes('one'));
      AddOnlySet.add(draft.set, 'k2', bytes('two'));
    });
    right.tab.change((draft: { set: AddOnlySet.Entries }) => {
      AddOnlySet.add(draft.set, 'k3', bytes('three'));
    });
    network.settle();
    left.tab.change((draft: { set: Partial<AddOnlySet.Entries> }) => {
      delete draft.set.k1;
    });
    network.settle();

    const fromTab = asTab(() => AddOnlySet.read(right.handle.doc(), ['set']));
    expect([...fromTab.keys()].sort()).toEqual(['k1', 'k2', 'k3']);
    expect(fromTab).toEqual(AddOnlySet.read(host.doc('doc'), ['set']));
    expect(leaks).toEqual([]);
  });

  test('migrateDocument clones and rewrites a tab document as it does an Automerge one', () => {
    leaks.length = 0;
    const host = new SpikeHost();
    host.create('doc', { title: 'Old', legacy: { name: 'x' }, keep: [1, 2] });
    const network = new Network(host);
    const tab = network.open('doc');
    const target = { title: 'New', renamed: { name: 'x' }, keep: [1, 2, 3] };
    const migrated = asTab(() => migrateDocument(tab.handle.doc(), target));
    const reference = migrateDocument(host.doc('doc'), target);
    expect(tagOf(migrated)).toBeDefined();
    expect(canon(A.toJS(migrated))).toBe(canon(A.toJS(reference)));
    expect(A.getHistory(migrated)).toHaveLength(A.getHistory(reference).length);
    expect(leaks).toEqual([]);
  });
});
