//
// Copyright 2026 DXOS.org
//

/**
 * Tells a component's own echoes apart from genuine external updates of a value it both reports and
 * receives (e.g. a calibration stored on an ECHO object). A parent may return reports late or out of
 * order, so every report still in flight is remembered: receiving any of them is an echo, and also
 * confirms everything reported before it.
 */
export class EchoFilter<T> {
  #pending: string[] = [];

  /** Records a value this side reported. */
  reported(value: T): void {
    this.#pending.push(JSON.stringify(value));
  }

  /** True when `value` is an echo of a report (stale or current); false for an external update. */
  isEcho(value: T): boolean {
    const index = this.#pending.indexOf(JSON.stringify(value));
    if (index < 0) {
      this.#pending = [];
      return false;
    }
    this.#pending = this.#pending.slice(index + 1);
    return true;
  }

  reset(): void {
    this.#pending = [];
  }
}
