//
// Copyright 2026 DXOS.org
//

/** Reports remembered; a parent returning one older than this is not plausible. */
const HISTORY = 32;

/**
 * Tells a component's own echoes apart from genuine external updates of a value it both reports and
 * receives (e.g. a calibration stored on an ECHO object). A parent may return reports late or out of
 * order, so every recent report stays recognizable: receiving any of them, in any order, is an echo.
 */
export class EchoFilter<T> {
  #reported: string[] = [];

  /** Records a value this side reported. */
  reported(value: T): void {
    this.#reported = [...this.#reported, JSON.stringify(value)].slice(-HISTORY);
  }

  /** True when `value` is one of this side's recent reports (current or stale); false for an external update. */
  isEcho(value: T): boolean {
    return this.#reported.includes(JSON.stringify(value));
  }

  reset(): void {
    this.#reported = [];
  }
}
