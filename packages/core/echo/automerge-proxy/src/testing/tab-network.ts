//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';

import { type Change } from '../internal/ids.ts';
import { type HostMessage, TabDoc, type TabDocument } from '../internal/tab-doc.ts';
import { type MemoryTabHost } from './tab-host.ts';

/**
 * Carries messages between tabs and the host asynchronously and in order per direction, cloning
 * each as a MessagePort would, so tests can interleave deliveries.
 */
export class TabNetwork {
  readonly #queue: { tab: string; run: () => void }[] = [];
  #nextTab = 0;

  readonly host: MemoryTabHost;

  constructor(host: MemoryTabHost) {
    this.host = host;
  }

  /** Opens `docId` in a new tab. */
  open<T>(docId: string, options?: { actor?: string }): Tab<T> {
    const tabId = `tab-${this.#nextTab++}`;
    let tab: TabDoc<T> | undefined;
    const snapshot = this.host.subscribe(docId, tabId, (message) => this.#deliverTo(tabId, () => tab, message));
    tab = TabDoc.fromSnapshot<T>(structuredClone(snapshot), {
      actor: options?.actor,
      send: (change: Change, bytes: Uint8Array) =>
        this.#post(tabId, () => this.host.submit(docId, tabId, change, bytes)),
    });
    return { id: tabId, docId, tab };
  }

  /** Creates a document in a tab; the host learns of it with the tab's first change. */
  create<T extends object>(docId: string, initial: T): Tab<T> {
    const tabId = `tab-${this.#nextTab++}`;
    let tab: TabDoc<T> | undefined;
    this.host.createFromTab(docId, tabId, (message) => this.#deliverTo(tabId, () => tab, message));
    tab = TabDoc.create(initial, {
      send: (change: Change, bytes: Uint8Array) =>
        this.#post(tabId, () => this.host.submit(docId, tabId, change, bytes)),
    });
    return { id: tabId, docId, tab };
  }

  /** Queues a host message for a tab that exists by the time the queue runs. */
  #deliverTo(tabId: string, tab: () => TabDocument | undefined, message: HostMessage): void {
    this.#post(tabId, () => {
      const target = tab();
      invariant(target, 'A message reached a tab before it opened');
      target.receive(structuredClone(message));
    });
  }

  #post(tab: string, run: () => void): void {
    this.#queue.push({ tab, run });
  }

  get pending(): number {
    return this.#queue.length;
  }

  /** Delivers up to `count` queued messages, the oldest first. */
  deliver(count = 1): void {
    for (let i = 0; i < count; i++) {
      const next = this.#queue.shift();
      if (!next) {
        return;
      }
      next.run();
    }
  }

  /** Delivers everything and lets the host apply its queues until nothing moves. */
  settle(): void {
    for (let rounds = 0; rounds < 1000; rounds++) {
      if (this.#queue.length === 0) {
        this.host.flush();
        if (this.#queue.length === 0) {
          return;
        }
      }
      this.deliver(this.#queue.length);
    }
    throw new Error('Network did not settle');
  }

  /** Drops every message in flight, as a worker restart does. */
  drop(): void {
    this.#queue.length = 0;
  }

  /** A tab follows its document again after the worker restarted. */
  reconnect<T>(tab: Tab<T>): void {
    const snapshot = this.host.subscribe(tab.docId, tab.id, (message) =>
      this.#deliverTo(tab.id, () => tab.tab, message),
    );
    tab.tab.reconnect(structuredClone(snapshot));
  }
}

export type Tab<T> = { id: string; docId: string; tab: TabDoc<T> };
