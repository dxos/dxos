//
// Copyright 2026 DXOS.org
//

import { SpikeHandle } from './handle.ts';
import { type SpikeHost } from './host.ts';
import { type Change } from './model.ts';
import { type HostMessage, TabDoc } from './tab.ts';

/**
 * Carries messages between tabs and the host asynchronously and in order per direction, cloning
 * each as a MessagePort would, so tests can interleave deliveries.
 */
export class Network {
  readonly #queue: { tab: string; run: () => void }[] = [];
  #nextTab = 0;

  constructor(readonly host: SpikeHost) {}

  /** Opens `docId` in a new tab. */
  open(docId: string, options?: { actor?: string }): Tab {
    const tabId = `tab-${this.#nextTab++}`;
    let tab!: TabDoc;
    const snapshot = this.host.subscribe(docId, tabId, (message) =>
      this.#post(tabId, () => tab.receive(structuredClone(message))),
    );
    tab = TabDoc.fromSnapshot(structuredClone(snapshot), {
      actor: options?.actor,
      send: (change: Change, bytes: Uint8Array) =>
        this.#post(tabId, () => this.host.submit(docId, tabId, change, bytes)),
    });
    return { id: tabId, docId, tab, handle: new SpikeHandle(tab) };
  }

  /** Creates a document in a tab; the host learns of it with the tab's first change. */
  create(docId: string, initial: Record<string, unknown>): Tab {
    const tabId = `tab-${this.#nextTab++}`;
    let tab!: TabDoc;
    this.host.createFromTab(docId, tabId, (message: HostMessage) =>
      this.#post(tabId, () => tab.receive(structuredClone(message))),
    );
    tab = TabDoc.create(initial, {
      send: (change: Change, bytes: Uint8Array) =>
        this.#post(tabId, () => this.host.submit(docId, tabId, change, bytes)),
    });
    return { id: tabId, docId, tab, handle: new SpikeHandle(tab) };
  }

  #post(tab: string, run: () => void): void {
    this.#queue.push({ tab, run });
  }

  get pending(): number {
    return this.#queue.length;
  }

  /** Delivers up to `count` queued messages, the oldest first. */
  deliver(count = 1): void {
    for (let i = 0; i < count && this.#queue.length > 0; i++) {
      this.#queue.shift()!.run();
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
  reconnect(tab: Tab): void {
    const snapshot = this.host.subscribe(tab.docId, tab.id, (message) =>
      this.#post(tab.id, () => tab.tab.receive(structuredClone(message))),
    );
    tab.tab.reconnect(structuredClone(snapshot));
  }
}

export type Tab = { id: string; docId: string; tab: TabDoc; handle: SpikeHandle };
