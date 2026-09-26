//
// Copyright 2026 DXOS.org
//

import * as Handle from '../Handle.ts';
import * as Host from '../Host.ts';
import * as Repo from '../Repo.ts';
import { MemoryStore, Transport } from './memory.ts';
import { createRandom } from './random.ts';

export type TabHarnessOptions = {
  /** Seeds the transports' delays, so a run's interleavings repeat. */
  seed?: number;
  /** Longest delay in milliseconds a transport holds a call or event. */
  maxDelay?: number;
};

/**
 * A host over a memory store, and tabs that reach it through transports it can drop, as a restart
 * does. Every document shares the shape `T`, so each tab's handles are typed with it.
 */
export class TabHarness<T = unknown> {
  readonly store = new MemoryStore();
  readonly transports: Transport[] = [];
  readonly repos: Repo.TabRepo<string, Handle.DocHandle<T>>[] = [];
  readonly pageEvents: EventTarget[] = [];
  readonly #random: ReturnType<typeof createRandom>;
  readonly #maxDelay: number;
  host: Host.DocumentHost;

  constructor({ seed = 7, maxDelay = 2 }: TabHarnessOptions = {}) {
    this.#random = createRandom(seed);
    this.#maxDelay = maxDelay;
    this.host = new Host.DocumentHost({ store: this.store });
  }

  async open(): Promise<void> {
    await this.host.open();
  }

  /** A new tab: a repo of tab documents behind its own transport. */
  async tab(): Promise<Repo.TabRepo<string, Handle.DocHandle<T>>> {
    const transport = new Transport({
      host: () => this.host,
      random: () => this.#random.next(),
      maxDelay: this.#maxDelay,
    });
    const pageEvents = new EventTarget();
    const repo = new Repo.TabRepo({
      host: transport,
      createHandle: (options) => new Handle.DocHandle<T>(options),
      pageEvents,
      resubscribeDelay: 5,
    });
    await repo.open();
    this.transports.push(transport);
    this.repos.push(repo);
    this.pageEvents.push(pageEvents);
    return repo;
  }

  /** Replaces the host with a new one over what the store saved, and drops every stream. */
  async restart(): Promise<void> {
    await this.host.close();
    this.store.restart();
    this.host = new Host.DocumentHost({ store: this.store });
    await this.host.open();
    this.transports.forEach((transport) => transport.drop());
  }

  async close(): Promise<void> {
    await Promise.all(this.repos.map((repo) => repo.close()));
    await this.host.close();
  }
}
