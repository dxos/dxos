//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { afterEach, describe, expect, test, vi } from 'vitest';

import { sleep, waitForCondition } from '@dxos/async';

import * as Automerge from './Automerge.ts';
import type * as Contract from './Contract.ts';
import { decodeChange } from './internal/automerge.ts';
import { encodeChange } from './internal/encode.ts';
import { TabHarness, canon, seeded } from './testing/index.ts';

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
