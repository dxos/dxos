//
// Copyright 2026 DXOS.org
//

type Sleeper = { at: number; seq: number; resolve: () => void };

/**
 * Time for a scripted scene. Every wait an actor makes goes through `sleep`, and only `advanceTo` moves
 * time, so the same script plays identically in real time (a rAF loop advancing it) and frame by frame
 * (a renderer seeking it).
 */
export class VirtualClock {
  #now = 0;
  #seq = 0;
  #sleepers: Sleeper[] = [];
  #tasks = 0;

  get now(): number {
    return this.#now;
  }

  /** Resolves once the clock has advanced `ms` past now. */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.#sleepers.push({ at: this.#now + Math.max(0, ms), seq: this.#seq++, resolve });
    });
  }

  /** Runs `task` as one of the concurrent tracks `advanceTo` waits on before moving time. */
  async track(task: () => Promise<void>): Promise<void> {
    this.#tasks++;
    try {
      await task();
    } finally {
      this.#tasks--;
    }
  }

  /**
   * Moves time to `ms`, waking sleepers in time order. Before each step it waits until every live track
   * is blocked in `sleep`, so a track's work between two waits (an edit, an operation) lands at the time
   * it was scheduled for however long it takes in real time.
   */
  async advanceTo(ms: number): Promise<void> {
    for (;;) {
      await this.#settle();
      this.#sleepers.sort((a, b) => a.at - b.at || a.seq - b.seq);
      const next = this.#sleepers[0];
      if (!next || next.at > ms) {
        break;
      }

      this.#sleepers.shift();
      this.#now = Math.max(this.#now, next.at);
      next.resolve();
    }

    this.#now = Math.max(this.#now, ms);
  }

  async #settle(timeout = 5_000): Promise<void> {
    const start = performance.now();
    while (this.#sleepers.length < this.#tasks && performance.now() - start < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  }
}
