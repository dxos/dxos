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
import { DXN, Obj, Type } from '@dxos/echo';
// eslint-disable-next-line import/first
import {
  checkoutVersion,
  createObject,
  getEditHistory,
  getEditHistoryWithDiffs,
  getObjectCore,
} from '@dxos/echo-client';

// eslint-disable-next-line import/first
import { SpikeHost } from './host.ts';
// eslint-disable-next-line import/first
import { asTab, leaks } from './namespace.ts';
// eslint-disable-next-line import/first
import { Network } from './network.ts';
// eslint-disable-next-line import/first
import { canon, unknownTo } from './testing.ts';

const Task = Schema.Struct({ title: Schema.String, status: Schema.String, tags: Schema.Array(Schema.String) }).pipe(
  Type.makeObject(DXN.make('com.example.test.task', '0.1.0')),
);

describe('full history in the tab', () => {
  test("ECHO's history functions read a tab document the way they read Automerge", () => {
    leaks.length = 0;
    // A real ECHO object with history, then edits from a tab and from another peer.
    const obj = createObject(Obj.make(Task, { title: 'Write spike', status: 'todo', tags: ['a'] }));
    Obj.update(obj, (obj) => {
      obj.status = 'doing';
    });
    Obj.update(obj, (obj) => {
      obj.tags.push('b');
      obj.title = 'Write the spike';
    });
    const host = new SpikeHost();
    host.adopt('task', A.clone(getObjectCore(obj).getDoc() as A.Doc<any>));
    const network = new Network(host);
    const tab = network.open('task');
    tab.handle.change((doc: any) => {
      doc.data.status = 'done';
    });
    tab.handle.change((doc: any) => {
      doc.data.tags.push('c');
    });
    network.settle();
    let peer = A.clone(host.doc('task'), { actor: 'eeee0000eeee0000eeee0000eeee0000' });
    peer = A.change(peer, (doc: any) => {
      doc.data.title = 'Peer title';
    });
    host.applyRemote('task', unknownTo(host.doc('task'), peer));
    network.settle();

    // One ECHO object over the worker's Automerge document, one over the tab's.
    const real = createObject(Obj.make(Task, { title: '', status: '', tags: [] }));
    const spike = createObject(Obj.make(Task, { title: '', status: '', tags: [] }));
    getObjectCore(real).doc = host.doc('task');
    getObjectCore(spike).doc = tab.handle.doc();
    getObjectCore(spike).id = getObjectCore(real).id;

    const realHistory = getEditHistory(real);
    const spikeHistory = getEditHistory(spike);
    expect(realHistory.length).toBeGreaterThan(5);
    expect(
      spikeHistory.map((state: any) => [state.change.hash, state.change.actor, state.change.seq, state.change.time]),
    ).toEqual(realHistory.map((state) => [state.change.hash, state.change.actor, state.change.seq, state.change.time]));
    realHistory.forEach((state, index) => {
      expect(canon(spikeHistory[index].snapshot)).toBe(canon(A.toJS(state.snapshot)));
    });

    // Every version since the object was made, through checkoutVersion.
    let frontier: string[] = [];
    for (const state of realHistory) {
      frontier = [...frontier.filter((hash) => !state.change.deps.includes(hash)), state.change.hash].sort();
      expect(canon(checkoutVersion(spike, frontier))).toBe(canon(checkoutVersion(real, frontier)));
    }

    // Obj.getChanges walks A.getChangesMetaSince, then views and diffs (both checked above).
    const pick = ({ hash, actor, seq, startOp, maxOp, time, message, deps }: any) => ({
      hash,
      actor,
      seq,
      startOp,
      maxOp,
      time,
      message,
      deps: [...deps].sort(),
    });
    expect(A.getChangesMetaSince(tab.handle.doc(), []).map(pick)).toEqual(
      A.getChangesMetaSince(host.doc('task'), []).map(pick),
    );

    // Replaying raw changes into a fresh document works too: in a tab, `A.init` makes a tab document
    // and `A.applyChanges` decodes the changes in JS.
    expect(asTab(() => getEditHistoryWithDiffs(spike))).toEqual(getEditHistoryWithDiffs(real));
    expect(leaks).toEqual([]);
  });

  test('fork and merge run in the worker; the tab reads the branch and sees the merge', () => {
    const host = new SpikeHost();
    host.create('main', { content: 'base text', title: new A.ImmutableString('main') });
    const network = new Network(host);
    const main = network.open('main');
    main.handle.change((doc: any) => Draft.splice(doc, ['content'], 4, 0, 'X'));
    network.settle();

    // createBranch: the worker forks at the tab's version; the tab opens the branch like any document.
    host.fork('main', 'branch', main.tab.heads());
    const branch = network.open('branch');
    expect(branch.handle.doc().content).toBe('baseX text');
    branch.handle.change((doc: any) => Draft.splice(doc, ['content'], 0, 0, 'B:'));
    main.handle.change((doc: any) => Draft.splice(doc, ['content'], doc.content.length, 0, '!'));
    network.settle();

    // mergeBranch: the worker merges; the tab's main document receives the branch's changes.
    const reference = A.merge(A.clone(host.doc('main')), A.clone(host.doc('branch')));
    host.merge('main', 'branch');
    network.settle();
    expect(main.handle.doc().content).toBe(reference.content);
    expect(main.handle.doc().content).toBe('B:baseX text!');
    expect(canon(main.handle.doc())).toBe(canon(A.toJS(A.load(A.save(host.doc('main'))))));
  });

  test('migrations: a copy in the worker, a rewrite as a new document the tab creates', () => {
    const host = new SpikeHost();
    host.create('old', { data: { title: 'Old title', legacyName: new A.ImmutableString('legacy') } });
    const network = new Network(host);
    const tab = network.open('old');

    // A.save then repo.import: the worker copies; the tab opens the copy.
    host.copy('old', 'copy');
    expect(canon(network.open('copy').handle.doc())).toBe(canon(tab.handle.doc()));

    // A.clone then A.change: the tab writes the rewritten data as a new document's first change.
    const old = tab.handle.doc();
    const rewritten = { data: { title: old.data.title, name: new A.ImmutableString(old.data.legacyName.toString()) } };
    const created = network.create('new', rewritten);
    network.settle();
    expect(created.tab.pending).toHaveLength(0);
    expect(canon(A.toJS(host.doc('new')))).toBe(canon(created.handle.doc()));
    expect(canon(A.toJS(A.from(rewritten)))).toBe(canon(created.handle.doc()));
  });
});
