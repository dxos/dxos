//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { describe, expect, test } from 'vitest';

import * as Draft from '@dxos/automerge-proxy/Draft';

import { SpikeHost } from './host.ts';
import { BatchedSender, type Outgoing } from './sender.ts';
import { TabDoc } from './tab.ts';

type Text = { content: string };

/** A tab whose changes go through a batched sender straight to the host, as a MessagePort would carry them. */
const openTab = (host: SpikeHost, target: EventTarget) => {
  const snapshot = host.subscribe('doc', 'tab', () => {});
  const batches: Outgoing[][] = [];
  const sender = new BatchedSender(
    (batch) => {
      batches.push(batch);
      batch.forEach(({ change, bytes }) => host.submit('doc', 'tab', change, bytes));
    },
    { target },
  );
  return { tab: TabDoc.fromSnapshot<Text>(snapshot, { send: sender.send }), sender, batches };
};

const type = (tab: TabDoc<Text>, text: string) => {
  for (const char of text) {
    tab.change((draft) => Draft.splice(draft, ['content'], draft.content.length, 0, char));
  }
};

/** Lets queued microtasks and zero-delay timers run, but not RepoProxy's 100 ms slot. */
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("sending a tab's changes", () => {
  test('the first change after a pause leaves at once, a burst goes as one batch, and the page hiding sends the rest', async () => {
    const host = new SpikeHost();
    host.create('doc', { content: '' });
    const page = new EventTarget();
    const { tab, sender, batches } = openTab(host, page);

    // Typed in one task: the batch leaves as soon as the task ends, not after a timer.
    type(tab, 'hello');
    await tick();
    expect(batches.map((batch) => batch.length)).toEqual([5]);
    const calls = host.applyCalls;
    host.flush();
    expect(host.applyCalls - calls).toBe(1);
    expect(host.doc<Text>('doc').content).toBe('hello');

    // Within 100 ms of that send, the next changes wait for their slot, as RepoProxy's do.
    type(tab, ' world');
    await tick();
    expect(sender.queued).toBe(6);

    // The page hides before the slot comes; what is queued still reaches the worker.
    page.dispatchEvent(new Event('pagehide'));
    expect(sender.queued).toBe(0);
    host.flush();
    expect(host.doc<Text>('doc').content).toBe('hello world');
    expect(A.getHeads(host.doc('doc'))).toEqual(tab.heads());
    await sender.close();
  });

  test('changes waiting for their slot are lost with a tab that goes without pagehide', async () => {
    const host = new SpikeHost();
    host.create('doc', { content: '' });
    const { tab, sender } = openTab(host, new EventTarget());
    type(tab, 'kept');
    await tick();
    type(tab, ' lost');
    await tick();
    expect(sender.queued).toBe(5);
    // The tab goes away before the slot comes.
    await sender.close();
    host.flush();
    expect(host.doc<Text>('doc').content).toBe('kept');
  });
});
