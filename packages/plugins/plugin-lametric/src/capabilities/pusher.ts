//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';

import * as LaMetric from '#protocol';
import { type LaMetricTransport } from '#transport';
import { type LaMetricCapabilities } from '#types';

export type PusherOptions = {
  readonly transport: LaMetricTransport;
  readonly minIntervalMs: number;
  /** Injected for tests; defaults to the platform clock and timer. */
  readonly now?: () => number;
  readonly schedule?: (fn: () => void, ms: number) => unknown;
  readonly onStatus?: (status: LaMetricCapabilities.PushStatus) => void;
};

/**
 * Rate-limits and de-duplicates pushes to one device.
 *
 * Two guards, both needed: the space fires a change on every mutation, and LaMetric's own guidance is
 * that push works best when data is not changing often. An unchanged payload is dropped outright; a
 * changed one inside the window is held and sent on the trailing edge, so the device always ends up
 * showing the latest state rather than the state at the start of a burst.
 */
export class Pusher {
  readonly #options: PusherOptions;
  readonly #now: () => number;
  readonly #schedule: (fn: () => void, ms: number) => unknown;
  #lastSerialized?: string;
  #lastSentAt = Number.NEGATIVE_INFINITY;
  #pending?: LaMetric.Payload;
  #scheduled = false;
  #closed = false;

  constructor(options: PusherOptions) {
    this.#options = options;
    this.#now = options.now ?? Date.now;
    this.#schedule = options.schedule ?? ((fn, ms) => setTimeout(fn, ms));
  }

  send(payload: LaMetric.Payload): void {
    if (this.#closed) {
      return;
    }
    const serialized = JSON.stringify(payload);
    if (serialized === this.#lastSerialized) {
      return;
    }
    this.#lastSerialized = serialized;

    const elapsed = this.#now() - this.#lastSentAt;
    if (elapsed >= this.#options.minIntervalMs) {
      this.#push(payload);
      return;
    }

    this.#pending = payload;
    if (!this.#scheduled) {
      this.#scheduled = true;
      this.#schedule(() => this.#flush(), this.#options.minIntervalMs - elapsed);
    }
  }

  close(): void {
    this.#closed = true;
    this.#pending = undefined;
  }

  #flush(): void {
    this.#scheduled = false;
    const payload = this.#pending;
    this.#pending = undefined;
    if (payload && !this.#closed) {
      this.#push(payload);
    }
  }

  #push(payload: LaMetric.Payload): void {
    this.#lastSentAt = this.#now();
    void this.#options.transport
      .push(payload)
      .then(() => this.#options.onStatus?.({ state: 'pushed', kind: this.#options.transport.kind }))
      .catch((error) => {
        // A peripheral display is not worth breaking the caller for; the status carries the failure.
        log('lametric push failed', { url: this.#options.transport.url, error });
        this.#options.onStatus?.({ state: 'failed' });
      });
  }
}
