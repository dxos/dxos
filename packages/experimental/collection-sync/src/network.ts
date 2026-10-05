//
// Copyright 2026 DXOS.org
//

import { Random } from './hash.ts';
import { type Message, type MessageType, messageBytes } from './protocol.ts';

export type Envelope = {
  from: string;
  to: string;
  sentAt: number;
  deliverAt: number;
  sequence: number;
  message: Message;
};

export type NetworkOptions = {
  /** Delivery delay in ticks: fixed, or uniform in `[min, max]` (which reorders messages). */
  latency?: number | readonly [number, number];
  /** Probability that any message is silently lost. */
  dropRate?: number;
  seed?: number;
};

export type TrafficStats = {
  messages: number;
  bytes: number;
  dropped: number;
  symbols: number;
  changes: number;
  byType: Record<MessageType, number>;
};

export const emptyTraffic = (): TrafficStats => ({
  messages: 0,
  bytes: 0,
  dropped: 0,
  symbols: 0,
  changes: 0,
  byType: { 'reconcile-request': 0, 'reconcile-symbols': 0, 'reconcile-done': 0, 'doc-sync': 0 },
});

/**
 * Simulated link: messages sent at tick t arrive at t + latency, unless dropped or the link is down.
 */
export class Network {
  readonly #random: Random;
  readonly #latency: readonly [number, number];
  #dropRate: number;
  #queue: Envelope[] = [];
  #sequence = 0;
  #connected = true;
  traffic: TrafficStats = emptyTraffic();

  constructor({ latency = 1, dropRate = 0, seed = 1 }: NetworkOptions = {}) {
    this.#random = new Random(seed);
    this.#latency = typeof latency === 'number' ? [latency, latency] : latency;
    this.#dropRate = dropRate;
  }

  get connected(): boolean {
    return this.#connected;
  }

  get inFlight(): number {
    return this.#queue.length;
  }

  set dropRate(value: number) {
    this.#dropRate = value;
  }

  /** Taking the link down loses everything in flight. */
  setConnected(connected: boolean): void {
    this.#connected = connected;
    if (!connected) {
      this.traffic.dropped += this.#queue.length;
      this.#queue = [];
    }
  }

  resetTraffic(): TrafficStats {
    const traffic = this.traffic;
    this.traffic = emptyTraffic();
    return traffic;
  }

  send(from: string, to: string, message: Message, now: number): void {
    this.traffic.messages++;
    this.traffic.bytes += messageBytes(message);
    this.traffic.byType[message.type]++;
    if (message.type === 'reconcile-symbols') {
      this.traffic.symbols += message.symbols.length;
    } else if (message.type === 'doc-sync') {
      this.traffic.changes += message.changes.length;
    }
    if (!this.#connected || this.#random.next() < this.#dropRate) {
      this.traffic.dropped++;
      return;
    }
    const [min, max] = this.#latency;
    const deliverAt = now + this.#random.int(min, max);
    this.#queue.push({ from, to, sentAt: now, deliverAt, sequence: this.#sequence++, message });
  }

  /** Removes and returns everything due by `now`, in delivery order. */
  deliver(now: number): Envelope[] {
    const due = this.#queue.filter((envelope) => envelope.deliverAt <= now);
    this.#queue = this.#queue.filter((envelope) => envelope.deliverAt > now);
    return due.sort((left, right) => left.deliverAt - right.deliverAt || left.sequence - right.sequence);
  }
}
