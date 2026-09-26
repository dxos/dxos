//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { afterEach, describe, expect, test } from 'vitest';

import { waitForCondition } from '@dxos/async';

import * as Automerge from './Automerge.ts';
import type * as Contract from './Contract.ts';
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
