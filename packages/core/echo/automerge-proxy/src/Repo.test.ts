//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { Trigger, sleep, waitForCondition } from '@dxos/async';

import * as Automerge from './Automerge.ts';
import type * as Contract from './Contract.ts';
import * as Handle from './Handle.ts';
import { decodeChange } from './internal/automerge.ts';
import { encodeChange } from './internal/encode.ts';
import { TabHarness, applyPatches, canon, seeded } from './testing/index.ts';

type Shape = { title: string; content: string; items: { name: string }[] };

const initial = (): Shape => ({ title: 'doc', content: 'hello', items: [] });

/** JSON with object keys sorted: Automerge orders a map's keys, and a tab's own writes keep theirs. */
const withoutMeta = (value: unknown): string => canon(value);

let harness: TabHarness<Shape> | undefined;

afterEach(async () => {
  await harness?.close();
  harness = undefined;
});

const setup = async (): Promise<TabHarness<Shape>> => {
  harness = new TabHarness<Shape>();
  await harness.open();
  return harness;
};

describe('tab documents over the host', () => {
  test('a tab opens a stored document, writes, and the host holds the same history once it acknowledges', async () => {
    const harness = await setup();
    const { store } = harness;
    store.put('doc', A.from<Shape>(initial()));
    const repo = await harness.tab();
    const handle = repo.find('doc');
    await handle.whenReady();
    expect(withoutMeta(handle.doc())).toBe(withoutMeta(A.toJS(store.get('doc'))));
    expect(handle.heads).toEqual(A.getHeads(store.get('doc')));

    handle.change((doc: Shape) => {
      doc.title = 'changed';
      Automerge.splice(doc, ['content'], 5, 0, ' world');
    });
    // Heads are final the moment the tab writes.
    const heads = handle.heads;
    expect(handle.hasPending).toBe(true);
    await repo.flush();
    expect(handle.hasPending).toBe(false);
    expect(A.getHeads(store.get('doc'))).toEqual(heads);
    expect(withoutMeta(A.toJS(store.get('doc')))).toBe(withoutMeta(handle.doc()));
  });

  test("another tab receives a tab's changes and both end with the host's heads", async () => {
    const harness = await setup();
    harness.store.put('doc', A.from<Shape>(initial()));
    const [first, second] = [await harness.tab(), await harness.tab()];
    const left = first.find('doc');
    const right = second.find('doc');
    await Promise.all([left.whenReady(), right.whenReady()]);

    for (let i = 0; i < 20; i++) {
      const writer = i % 2 === 0 ? left : right;
      writer.change((doc: Shape) => {
        doc.items.push({ name: `item ${i}` });
      });
    }
    await Promise.all([first.flush(), second.flush()]);
    await waitForCondition({
      condition: () => left.heads.join() === right.heads.join(),
      timeout: 5_000,
    });
    expect(left.heads).toEqual(A.getHeads(harness.store.get('doc')));
    expect(withoutMeta(left.doc())).toBe(withoutMeta(right.doc()));
    expect(left.doc().items).toHaveLength(20);
  });

  test('a tab creates a document from its own first change, which the host holds unaltered', async () => {
    const harness = await setup();
    const repo = await harness.tab();
    const handle = repo.create(initial());
    // Readable and writable before the host names it.
    expect(handle.doc().title).toBe('doc');
    handle.change((doc: Shape) => {
      doc.items.push({ name: 'early' });
    });
    await repo.flushCreations();
    await repo.flush();
    const documentId = handle.documentId;
    expect(documentId).toBeDefined();
    if (!documentId) {
      return;
    }
    const stored = harness.store.get<Shape>(documentId);
    expect(A.getHeads(stored)).toEqual(handle.heads);
    // One history, so the early write is not hidden behind a concurrent initial change.
    expect(A.getAllChanges(stored)).toHaveLength(2);
    expect(A.toJS(stored).items).toEqual([{ name: 'early' }]);

    const other = await harness.tab();
    const opened = other.find(documentId);
    await opened.whenReady();
    expect(withoutMeta(opened.doc())).toBe(withoutMeta(handle.doc()));
  });

  test("a tab imports another document's history, which the host holds whole, and merges back into it", async () => {
    const harness = await setup();
    // A history from two actors, as a fork of a shared document carries it.
    let source = A.from<Shape>(initial(), { actor: 'aaaa0000aaaa0000aaaa0000aaaa0000' });
    let peer = A.clone(source, { actor: 'bbbb0000bbbb0000bbbb0000bbbb0000' });
    peer = A.change(peer, (doc) => {
      doc.title = 'from a peer';
    });
    source = A.merge(source, peer);
    const repo = await harness.tab();
    const original = repo.import(A.getAllChanges(source));
    expect(original.doc().title).toBe('from a peer');
    const fork = repo.import(A.getAllChanges(source));
    fork.change((doc: Shape) => {
      doc.items.push({ name: 'on the fork' });
    });
    await repo.flushCreations();
    await repo.flush();
    const [originalId, forkId] = [original.documentId, fork.documentId];
    expect(originalId).toBeDefined();
    expect(forkId).toBeDefined();
    if (!originalId || !forkId) {
      return;
    }
    expect(A.getHeads(harness.store.get<Shape>(originalId))).toEqual(A.getHeads(source));

    // Merging the fork back relays the changes the original lacks, which the host checks like any other.
    Automerge.merge(original.doc(), fork.doc());
    await repo.flush();
    const merged = A.toJS(harness.store.get<Shape>(originalId));
    expect(merged.items).toEqual([{ name: 'on the fork' }]);
    expect(A.getHeads(harness.store.get<Shape>(originalId))).toEqual(original.heads);
  });

  test("a peer's change that reaches the host's store reaches every follower", async () => {
    const harness = await setup();
    harness.store.put('doc', A.from<Shape>(initial()));
    const repo = await harness.tab();
    const handle = repo.find('doc');
    await handle.whenReady();
    let peer = A.clone(harness.store.get<Shape>('doc'));
    peer = A.change(peer, (doc: Shape) => {
      doc.title = 'from a peer';
    });
    harness.store.merge('doc', peer);
    await waitForCondition({ condition: () => handle.doc().title === 'from a peer', timeout: 5_000 });
    expect(handle.heads).toEqual(A.getHeads(harness.store.get('doc')));
  });

  test('the host refuses a change whose bytes do not match its claimed hash, and a flush fails on it', async () => {
    const harness = await setup();
    harness.store.put('doc', A.from<Shape>(initial()));
    const subscriptionId = 'subscription';
    const events: Contract.DocumentEvent[] = [];
    harness.host.subscribe({ subscriptionId, clientId: 'client' }, { onEvents: (batch) => events.push(...batch) });
    await harness.host.updateSubscription({ subscriptionId, add: [{ documentId: 'doc' }] });
    await waitForCondition({ condition: () => events.some((event) => event.type === 'snapshot') });
    const tab = A.clone(harness.store.get<Shape>('doc'));
    const changed = A.change(tab, (doc: Shape) => {
      doc.title = 'x';
    });
    const bytes = A.getLastLocalChange(changed);
    expect(bytes).toBeDefined();
    if (!bytes) {
      return;
    }
    const [result] = await harness.host.submit({
      subscriptionId,
      batches: [{ documentId: 'doc', changes: [{ hash: '00'.repeat(32), bytes }] }],
    });
    expect(result.status).toBe('accepted');
    expect(events).toContainEqual(expect.objectContaining({ type: 'refuse', hash: '00'.repeat(32) }));
  });

  test('the host refuses bytes that are not canonical, which Automerge would index and export under different hashes', async () => {
    const harness = await setup();
    // Concurrent writes to one key, so overwriting both gives an op with two preds.
    let doc = A.from<Shape>(initial(), { actor: 'aaaa0000aaaa0000aaaa0000aaaa0000' });
    let peer = A.clone(doc, { actor: 'bbbb0000bbbb0000bbbb0000bbbb0000' });
    doc = A.change(doc, (draft) => {
      draft.title = 'left';
    });
    peer = A.change(peer, (draft) => {
      draft.title = 'right';
    });
    harness.store.put('doc', A.merge(doc, peer));
    const merged = A.change(
      A.clone(harness.store.get<Shape>('doc'), { actor: 'cccc0000cccc0000cccc0000cccc0000' }),
      (draft) => {
        draft.title = 'merged';
      },
    );
    const canonical = A.getLastLocalChange(merged);
    expect(canonical).toBeDefined();
    if (!canonical) {
      return;
    }
    const change = decodeChange(canonical);
    expect(change.ops[0].pred).toHaveLength(2);
    const reversed = { ...change, ops: change.ops.map((op) => ({ ...op, pred: [...op.pred].reverse() })) };
    const { bytes, hash } = encodeChange(reversed, { predOrder: 'given' });
    expect(hash).not.toBe(change.hash);

    const subscriptionId = 'subscription';
    const events: Contract.DocumentEvent[] = [];
    harness.host.subscribe({ subscriptionId, clientId: 'client' }, { onEvents: (batch) => events.push(...batch) });
    await harness.host.updateSubscription({ subscriptionId, add: [{ documentId: 'doc' }] });
    await waitForCondition({ condition: () => events.some((event) => event.type === 'snapshot') });
    await harness.host.submit({ subscriptionId, batches: [{ documentId: 'doc', changes: [{ hash, bytes }] }] });
    expect(events).toContainEqual(expect.objectContaining({ type: 'refuse', hash, reason: 'not canonically encoded' }));

    // Without the check the heads name one hash and the exported change another, so the save does not load.
    const [poisoned] = A.applyChanges(A.clone(harness.store.get('doc')), [bytes]);
    expect(A.getHeads(poisoned)).toEqual([hash]);
    expect(A.getAllChanges(poisoned).map((stored) => A.decodeChange(stored).hash)).not.toContain(hash);
    expect(() => A.load(A.save(poisoned))).toThrow(/mismatching heads/);

    // The canonical bytes of the same change go through.
    await harness.host.submit({
      subscriptionId,
      batches: [{ documentId: 'doc', changes: [{ hash: change.hash, bytes: canonical }] }],
    });
    await waitForCondition({ condition: () => events.some((event) => event.type === 'ack') });
    expect(A.getHeads(harness.store.get('doc'))).toEqual([change.hash]);
    expect(A.getHeads(A.load(A.save(harness.store.get('doc'))))).toEqual([change.hash]);
  });

  test('the host applies a burst of tab changes in one Automerge call', async () => {
    const harness = await setup();
    harness.store.put('doc', A.from<Shape>(initial()));
    const repo = await harness.tab();
    const handle = repo.find('doc');
    await handle.whenReady();
    const before = harness.store.applyCalls;
    for (let i = 0; i < 50; i++) {
      handle.change((doc: Shape) => {
        Automerge.splice(doc, ['content'], doc.content.length, 0, 'x');
      });
    }
    await repo.flush();
    expect(harness.store.applyCalls - before).toBe(1);
    expect(A.toJS(harness.store.get<Shape>('doc')).content).toBe(`hello${'x'.repeat(50)}`);
  });

  test('the first change after a pause leaves at once, a burst goes as one batch, and the page hiding sends the rest', async () => {
    const harness = await setup();
    harness.store.put('doc', A.from<Shape>(initial()));
    // One pass a second, so the test can act inside a pass's slot however slow the machine.
    const repo = await harness.tab({ maxSendRate: 1 });
    const handle = repo.find('doc');
    await handle.whenReady();
    const submit = vi.spyOn(harness.host, 'submit');
    const sent = () =>
      submit.mock.calls.map(([request]) => request.batches.reduce((sum, batch) => sum + batch.changes.length, 0));
    const type = (text: string) => {
      for (const char of text) {
        handle.change((doc: Shape) => {
          Automerge.splice(doc, ['content'], doc.content.length, 0, char);
        });
      }
    };
    // The follow is a pass and its answer schedules another, so a pause is two slots long.
    await sleep(2_100);

    // Typed in one task: the batch leaves as soon as the task ends, not after a timer.
    type(' abcd');
    await waitForCondition({ condition: () => submit.mock.calls.length > 0, timeout: 300 });
    expect(sent()).toEqual([5]);

    // Within a second of that pass, the next changes wait for their slot, as RepoProxy's do.
    type(' efghi');
    await sleep(100);
    expect(sent()).toEqual([5]);

    // The page hides before the slot comes; what is queued still reaches the host at once.
    harness.pageEvents[0].dispatchEvent(new Event('pagehide'));
    await waitForCondition({ condition: () => submit.mock.calls.length > 1, timeout: 500 });
    expect(sent()).toEqual([5, 6]);
    await repo.flush();
    expect(A.toJS(harness.store.get<Shape>('doc')).content).toBe('hello abcd efghi');
    expect(A.getHeads(harness.store.get('doc'))).toEqual(handle.heads);
  });

  test('changes waiting for their slot are lost with a tab that closes without pagehide', async () => {
    const harness = await setup();
    harness.store.put('doc', A.from<Shape>(initial()));
    const repo = await harness.tab({ maxSendRate: 1 });
    const handle = repo.find('doc');
    await handle.whenReady();
    handle.change((doc: Shape) => {
      Automerge.splice(doc, ['content'], 5, 0, ' kept');
    });
    await repo.flush();
    handle.change((doc: Shape) => {
      Automerge.splice(doc, ['content'], 10, 0, ' lost');
    });
    await repo.close();
    await sleep(100);
    expect(A.toJS(harness.store.get<Shape>('doc')).content).toBe('hello kept');
  });

  test('a restarted host loses nothing a tab holds: every tab sends back what the host lacks', async () => {
    const harness = await setup();
    harness.store.put('doc', A.from<Shape>(initial()));
    const [first, second] = [await harness.tab(), await harness.tab()];
    const left = first.find('doc');
    const right = second.find('doc');
    await Promise.all([left.whenReady(), right.whenReady()]);
    left.change((doc: Shape) => {
      doc.items.push({ name: 'saved' });
    });
    await first.flush();
    await waitForCondition({ condition: () => right.heads.join() === left.heads.join(), timeout: 5_000 });

    // The next save fails, so the host restarts without this change; both tabs hold it.
    harness.store.failSaves = 1;
    left.change((doc: Shape) => {
      doc.items.push({ name: 'unsaved' });
    });
    await waitForCondition({ condition: () => right.heads.join() === left.heads.join(), timeout: 5_000 });
    await harness.restart();
    right.change((doc: Shape) => {
      doc.title = 'after the restart';
    });
    await Promise.all([first.flush(), second.flush()]);
    await waitForCondition({
      condition: () =>
        left.heads.join() === right.heads.join() && A.getHeads(harness.store.get('doc')).join() === left.heads.join(),
      timeout: 5_000,
    });
    const stored = A.toJS(harness.store.get<Shape>('doc'));
    expect(stored.items.map(({ name }) => name)).toEqual(['saved', 'unsaved']);
    expect(stored.title).toBe('after the restart');
  });

  test('pagehide sends what is queued without waiting for the next send slot', async () => {
    const harness = await setup();
    harness.store.put('doc', A.from<Shape>(initial()));
    const repo = await harness.tab();
    const handle = repo.find('doc');
    await handle.whenReady();
    for (let i = 0; i < 5; i++) {
      handle.change((doc: Shape) => {
        doc.title = `write ${i}`;
      });
    }
    harness.pageEvents[0].dispatchEvent(new Event('pagehide'));
    await waitForCondition({
      condition: () => A.getHeads(harness.store.get('doc')).join() === handle.heads.join(),
      timeout: 5_000,
    });
  });

  test('changes written with random interleavings from several tabs converge with the host', async () => {
    const harness = await setup();
    harness.store.put('doc', A.from<Shape>(initial()));
    const repos = [await harness.tab(), await harness.tab(), await harness.tab()];
    const handles = repos.map((repo) => repo.find('doc'));
    await Promise.all(handles.map((handle) => handle.whenReady()));
    const { pick } = seeded(3);
    for (let step = 0; step < 60; step++) {
      const handle = handles[pick(handles.length)];
      handle.change((doc: Shape) => {
        const text = doc.content;
        Automerge.splice(doc, ['content'], pick(text.length + 1), 0, String(step % 10));
      });
      if (step % 7 === 0) {
        await new Promise((resolve) => setTimeout(resolve, pick(5)));
      }
    }
    await Promise.all(repos.map((repo) => repo.flush()));
    await waitForCondition({
      condition: () => {
        const heads = A.getHeads(harness.store.get('doc')).join();
        return handles.every((handle) => handle.heads.join() === heads);
      },
      timeout: 10_000,
    });
    const content = A.toJS(harness.store.get<Shape>('doc')).content;
    expect(handles.every((handle) => handle.doc().content === content)).toBe(true);
    expect(content).toHaveLength('hello'.length + 60);
  });

  test("a tab's change encodes to the bytes Automerge stores under its hash", async () => {
    const harness = await setup();
    harness.store.put('doc', A.from<Shape>(initial()));
    const repo = await harness.tab();
    const handle = repo.find('doc');
    await handle.whenReady();
    handle.change((doc: Shape) => {
      doc.title = 'bytes';
    });
    await repo.flush();
    const [hash] = handle.heads;
    const change = handle.tab.model.changeOf(hash);
    const stored = A.getAllChanges(harness.store.get('doc')).find((bytes) => A.decodeChange(bytes).hash === hash);
    expect(stored).toEqual(encodeChange(change).bytes);
  });
});

describe('tab documents read through index copies', () => {
  type Items = Shape & { items: { name: string }[] };

  /** Every change the handle reports whose patches do not turn the document it had into the one it has. */
  const patchMismatches = (handle: Handle.DocHandle<Shape>): string[] => {
    const mismatches: string[] = [];
    handle.on('change', ({ patches, patchInfo }) => {
      const applied = withoutMeta(applyPatches(patchInfo.before, patches));
      if (applied !== withoutMeta(patchInfo.after)) {
        mismatches.push(`${patchInfo.source}: ${applied} instead of ${withoutMeta(patchInfo.after)}`);
      }
    });
    return mismatches;
  };

  /** A stored document with three items, and an index copy of it at its current heads. */
  const indexed = async () => {
    const harness = await setup();
    const doc = A.change(A.from<Shape>(initial()), (draft) => {
      draft.items.push({ name: 'a' }, { name: 'b' }, { name: 'c' });
    });
    harness.store.put('doc', doc);
    harness.copies.set('doc', { heads: A.getHeads(doc), value: A.toJS(doc) });
    return harness;
  };

  test('a tab reads a document through its copy, and the host does not load it', async () => {
    const harness = await indexed();
    const loads = vi.spyOn(harness.store, 'withDocument');
    const repo = await harness.tab();
    const handle = repo.find('doc', { copy: true });
    await handle.whenReady();
    expect(handle.isCopy).toBe(true);
    expect(withoutMeta(handle.doc())).toBe(withoutMeta(A.toJS(harness.store.get('doc'))));
    expect(handle.heads).toEqual(A.getHeads(harness.store.get('doc')));
    expect(loads).not.toHaveBeenCalled();
  });

  test('a read the copy cannot answer fails, and makes the tab follow the document so the next one succeeds', async () => {
    const harness = await indexed();
    const repo = await harness.tab();
    const handle = repo.find('doc', { copy: true });
    await handle.whenReady();
    // A copy carries no op ids, so a cursor needs the document.
    expect(() => Automerge.getCursor(handle.doc(), ['content'], 1)).toThrow(Handle.TabDocumentCopyError);
    await waitForCondition({ condition: () => !handle.isCopy, timeout: 5_000 });
    const cursor = Automerge.getCursor(handle.doc(), ['content'], 1);
    expect(A.getCursorPosition(harness.store.get('doc'), ['content'], cursor)).toBe(1);
  });

  test("a write on a copy goes live and lands at the copy's heads, among changes the copy lacked", async () => {
    const harness = await indexed();
    // A peer inserts before the items after the index copied the document.
    let peer = A.clone(harness.store.get<Items>('doc'), { actor: 'eeee0000eeee0000eeee0000eeee0000' });
    peer = A.change(peer, (draft) => {
      draft.items.unshift({ name: 'new' });
    });
    harness.store.merge('doc', peer);

    const repo = await harness.tab();
    const handle = repo.find('doc', { copy: true });
    const mismatches = patchMismatches(handle);
    await handle.whenReady();
    expect(handle.doc().items.map(({ name }) => name)).toEqual(['a', 'b', 'c']);
    // The tab means item `c`, which is at index 3 once the insert it has not seen is applied.
    handle.change((doc: Shape) => {
      doc.items[2].name = 'C';
    });
    expect(handle.doc().items.map(({ name }) => name)).toEqual(['a', 'b', 'C']);
    expect(handle.heads[0]).toMatch(/^copy:/);
    expect(handle.hasPending).toBe(true);

    await repo.flush();
    const expected = ['new', 'a', 'b', 'C'];
    expect(handle.isCopy).toBe(false);
    expect(A.toJS(harness.store.get<Items>('doc')).items.map(({ name }) => name)).toEqual(expected);
    expect(handle.doc().items.map(({ name }) => name)).toEqual(expected);
    expect(handle.heads).toEqual(A.getHeads(harness.store.get('doc')));
    expect(mismatches).toEqual([]);
  });

  test('a copy that changes reaches the tab, and one that stops being exact makes the tab follow the document', async () => {
    const harness = await indexed();
    const repo = await harness.tab();
    const handle = repo.find('doc', { copy: true });
    const mismatches = patchMismatches(handle);
    await handle.whenReady();

    let peer = A.clone(harness.store.get<Shape>('doc'), { actor: 'eeee0000eeee0000eeee0000eeee0000' });
    peer = A.change(peer, (draft) => {
      draft.title = 'renamed';
    });
    harness.store.merge('doc', peer);
    const before = handle.heads;
    const after = A.getHeads(harness.store.get('doc'));
    harness.copies.set('doc', { heads: after, value: A.toJS(harness.store.get('doc')) });
    harness.host.copiesChanged(new Set(['doc']));
    await waitForCondition({ condition: () => handle.doc().title === 'renamed', timeout: 5_000 });
    expect(handle.isCopy).toBe(true);
    // An editor diffs the version it saw last against the new one; strings are text, spliced.
    expect(Automerge.diff(handle.doc(), before, after)).toEqual([
      { action: 'del', path: ['title', 0], length: 3 },
      { action: 'splice', path: ['title', 0], value: 'renamed' },
    ]);

    harness.copies.delete('doc');
    harness.host.copiesChanged(new Set(['doc']));
    await waitForCondition({ condition: () => !handle.isCopy, timeout: 5_000 });
    expect(handle.heads).toEqual(A.getHeads(harness.store.get('doc')));
    expect(withoutMeta(handle.doc())).toBe(withoutMeta(A.toJS(harness.store.get('doc'))));
    expect(mismatches).toEqual([]);
  });

  test('a write on a copy older than the one shown fails, and makes the tab follow the document so it can be retried', async () => {
    const harness = await indexed();
    const repo = await harness.tab();
    const handle = repo.find('doc', { copy: true });
    await handle.whenReady();
    const before = handle.heads;
    let peer = A.clone(harness.store.get<Shape>('doc'), { actor: 'eeee0000eeee0000eeee0000eeee0000' });
    peer = A.change(peer, (draft) => {
      draft.title = 'renamed';
    });
    harness.store.merge('doc', peer);
    harness.copies.set('doc', { heads: A.getHeads(harness.store.get('doc')), value: A.toJS(harness.store.get('doc')) });
    harness.host.copiesChanged(new Set(['doc']));
    await waitForCondition({ condition: () => handle.doc().title === 'renamed', timeout: 5_000 });

    const write = () => handle.changeAt(before, (doc: Shape) => Automerge.splice(doc, ['content'], 0, 0, '>'));
    expect(write).toThrow(Handle.TabDocumentCopyError);
    await waitForCondition({ condition: () => !handle.isCopy, timeout: 5_000 });
    write();
    await repo.flush();
    expect(A.toJS(harness.store.get<Shape>('doc'))).toMatchObject({ title: 'renamed', content: '>hello' });
  });

  test('a nested value from an early copy still reads after many newer copies', async () => {
    const harness = await indexed();
    const repo = await harness.tab();
    const handle = repo.find('doc', { copy: true });
    await handle.whenReady();
    const [first] = handle.doc().items;
    let peer = A.clone(harness.store.get<Shape>('doc'), { actor: 'eeee0000eeee0000eeee0000eeee0000' });
    // More copies than the tab keeps versions of, none touching the items.
    for (let round = 0; round < 10; round++) {
      peer = A.change(peer, (draft) => {
        draft.title = `round ${round}`;
      });
      harness.store.merge('doc', peer);
      const stored = harness.store.get('doc');
      harness.copies.set('doc', { heads: A.getHeads(stored), value: A.toJS(stored) });
      harness.host.copiesChanged(new Set(['doc']));
      await waitForCondition({ condition: () => handle.doc().title === `round ${round}`, timeout: 5_000 });
    }
    expect(handle.isCopy).toBe(true);
    expect(handle.doc().items[0]).toBe(first);
    expect(Automerge.toJS(first)).toEqual({ name: 'a' });
  });

  test('a write made as the copy arrives still reaches the host', async () => {
    const harness = await indexed();
    const repo = await harness.tab();
    const handle = repo.find('doc', { copy: true });
    // Writes as soon as the document arrives, as a migration run on load would.
    handle.once('change', () => {
      handle.change((doc: Shape) => {
        doc.title = 'written on arrival';
      });
    });
    await handle.whenReady();
    await repo.flush();
    expect(handle.isCopy).toBe(false);
    expect(A.toJS(harness.store.get<Shape>('doc')).title).toBe('written on arrival');
  });

  test('a write made before the copy arrives makes the tab follow the document, and reaches the host', async () => {
    const harness = await indexed();
    // Holds the copy back until the tab has written, so the copy reaches a tab holding its own change.
    const written = new Trigger();
    const read = harness.copies.read.bind(harness.copies);
    const reads = vi.spyOn(harness.copies, 'read').mockImplementation(async (documentIds) => {
      await written.wait();
      return read(documentIds);
    });
    const repo = await harness.tab();
    const handle = repo.find('doc', { copy: true });
    await waitForCondition({ condition: () => reads.mock.calls.length > 0, timeout: 5_000 });
    // The tab holds nothing yet, so the write is concurrent with the whole document.
    handle.change((doc: Shape) => {
      doc.title = 'early';
    });
    const early = handle.heads;
    written.wake();

    await repo.flush();
    expect(handle.isCopy).toBe(false);
    const stored = harness.store.get('doc');
    expect(A.hasHeads(stored, early)).toBe(true);
    expect(handle.heads).toEqual(A.getHeads(stored));
  });

  test('a copy a query brought makes the handle ready at once', async () => {
    const harness = await indexed();
    const repo = await harness.tab();
    const doc = harness.store.get<Shape>('doc');
    repo.primeCopy('doc', { heads: A.getHeads(doc), value: A.toJS(doc) });
    const handle = repo.find('doc', { copy: true });
    expect(handle.isReady()).toBe(true);
    expect(handle.isCopy).toBe(true);
    expect(handle.doc().items).toHaveLength(3);
  });

  test('an editor writes on a copy through changeAt, and the heads it holds resolve once the document arrives', async () => {
    const harness = await indexed();
    const repo = await harness.tab();
    const handle = repo.find('doc', { copy: true });
    const mismatches = patchMismatches(handle);
    await handle.whenReady();
    const start = handle.heads;
    const first = handle.changeAt(start, (doc: Shape) => Automerge.splice(doc, ['content'], 5, 0, ' world'));
    expect(first?.[0]).toMatch(/^copy:/);
    if (!first) {
      return;
    }
    expect(Automerge.diff(handle.doc(), start, first)).toEqual([
      { action: 'splice', path: ['content', 5], value: ' world' },
    ]);
    const second = handle.changeAt(first, (doc: Shape) => Automerge.splice(doc, ['content'], 11, 0, '!'));
    if (!second) {
      return;
    }
    expect(handle.doc().content).toBe('hello world!');

    await repo.flush();
    expect(handle.isCopy).toBe(false);
    expect(A.toJS(harness.store.get<Shape>('doc')).content).toBe('hello world!');
    // The heads an editor kept name the changes its writes became.
    expect(Automerge.diff(handle.doc(), second, handle.heads)).toEqual([]);
    expect(Automerge.diff(handle.doc(), start, second)).toEqual(
      A.diff(harness.store.get('doc'), start, A.getHeads(harness.store.get('doc'))),
    );
    expect(mismatches).toEqual([]);
  });

  test('writes on a copy of a version the host no longer has are refused together, and leave nothing in the tab', async () => {
    const harness = await indexed();
    // The index copied a fourth item the host has lost since, as a restart loses a change it had not saved.
    const lost = A.change(A.clone(harness.store.get<Items>('doc')), (draft) => {
      draft.items.push({ name: 'd' });
    });
    harness.copies.set('doc', { heads: A.getHeads(lost), value: A.toJS(lost) });
    const repo = await harness.tab();
    const handle = repo.find('doc', { copy: true });
    const mismatches = patchMismatches(handle);
    await handle.whenReady();
    const refused = new Promise<Handle.Refusal>((resolve) => handle.refused.once(resolve));
    // The title's ops apply before the missing item fails the write, so the tab must take them back.
    handle.change((doc: Items) => {
      doc.title = 'lost';
      doc.items[3].name = 'D';
    });
    const [first] = handle.heads;
    handle.change((doc: Items) => {
      doc.items[0].name = 'A';
    });
    const [second] = handle.heads;
    const { hashes, reason } = await refused;
    expect(hashes).toEqual([first, second]);
    expect(reason).toMatch(/^2 writes/);
    expect(handle.isCopy).toBe(false);

    handle.change((doc: Items) => {
      doc.items[1].name = 'B';
    });
    await repo.flush();
    const stored = harness.store.get<Items>('doc');
    expect(A.toJS(stored).title).toBe('doc');
    expect(withoutMeta(handle.doc())).toBe(withoutMeta(A.toJS(stored)));
    // Read afresh from the model, where ops a failed write left behind would show.
    expect(withoutMeta(Automerge.view(handle.doc(), handle.heads))).toBe(withoutMeta(A.toJS(stored)));
    expect(handle.heads).toEqual(A.getHeads(stored));
    expect(mismatches).toEqual([]);
  });

  test('a write on a copy survives the host restarting before it lands', async () => {
    const harness = await indexed();
    const repo = await harness.tab();
    const handle = repo.find('doc', { copy: true });
    await handle.whenReady();
    handle.change((doc: Shape) => {
      doc.title = 'edited';
    });
    await harness.restart();
    await repo.flush();
    expect(handle.isCopy).toBe(false);
    expect(A.toJS(harness.store.get<Shape>('doc')).title).toBe('edited');
  });
});
