//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { afterEach, describe, expect, test, vi } from 'vitest';

import * as Draft from '@dxos/automerge-proxy/Draft';

import { SpikeHost } from './host.ts';
import { BatchedSender } from './sender.ts';
import { TabDoc } from './tab.ts';

type Text = { content: string };

/** A tab whose changes go through a batched sender straight to the host, as a MessagePort would carry them. */
const openTab = (host: SpikeHost, tabId: string, target: EventTarget) => {
  const snapshot = host.subscribe('doc', tabId, () => {});
  const sender = new BatchedSender(
    (batch) => batch.forEach(({ change, bytes }) => host.submit('doc', tabId, change, bytes)),
    { target },
  );
  return { tab: TabDoc.fromSnapshot<Text>(snapshot, { send: sender.send }), sender };
};

const type = (tab: TabDoc<Text>, text: string) => {
  for (const char of text) {
    tab.change((draft) => Draft.splice(draft, ['content'], draft.content.length, 0, char));
  }
};

afterEach(() => {
  vi.useRealTimers();
});

describe('edits pending when a tab closes', () => {
  test('a tab sends a burst as one batch, and sends what is queued when the page hides', () => {
    vi.useFakeTimers();
    const host = new SpikeHost();
    host.create('doc', { content: '' });
    const page = new EventTarget();
    const { tab, sender } = openTab(host, 'tab', page);

    // A burst goes as one batch, which the worker applies in one Automerge call.
    type(tab, 'hello');
    expect(sender.queued).toBe(5);
    vi.advanceTimersByTime(100);
    const calls = host.applyCalls;
    host.flush();
    expect(host.applyCalls - calls).toBe(1);
    expect(host.doc<Text>('doc').content).toBe('hello');

    // The page hides before the next batch is due; what is queued still reaches the worker.
    type(tab, ' world');
    expect(sender.queued).toBe(6);
    page.dispatchEvent(new Event('pagehide'));
    expect(sender.queued).toBe(0);
    host.flush();
    expect(host.doc<Text>('doc').content).toBe('hello world');
    expect(A.getHeads(host.doc('doc'))).toEqual(tab.heads());
  });

  test('without the page-hide send, a queued batch is lost with the tab', () => {
    vi.useFakeTimers();
    const host = new SpikeHost();
    host.create('doc', { content: '' });
    const { tab } = openTab(host, 'tab', new EventTarget());
    type(tab, 'lost');
    // The tab goes away without a pagehide event reaching the sender.
    host.flush();
    expect(host.doc<Text>('doc').content).toBe('');
  });
});
