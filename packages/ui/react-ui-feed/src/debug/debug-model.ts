//
// Copyright 2026 DXOS.org
//

/**
 * One live readout: a name and how to read it. Reading must be cheap — the table reads every probe
 * once per animation frame while it is shown.
 */
export type DebugProbe = {
  id: string;
  /** Probes render grouped; a group is a component's or an aspect's set. */
  group?: string;
  label?: string;
  unit?: string;
  read: () => number | string;
  /** Emphasis when the value means something is wrong. */
  alarm?: (value: number | string) => boolean;
};

/**
 * A registry of live readouts, so a debug table can render *whatever is currently instrumented*
 * rather than a hard-coded panel per surface (SPEC follow-up: the generic debug mechanism).
 *
 * Deliberately not reactive state: probes are read by whoever renders them, per frame, and a value
 * that changed sixty times a second is not worth sixty renders of anything but the table itself.
 * Registration is the only event.
 */
export class DebugModel {
  readonly #probes = new Map<string, DebugProbe>();
  readonly #listeners = new Set<() => void>();

  register(probe: DebugProbe): () => void {
    this.#probes.set(probe.id, probe);
    this.#publish();
    return () => {
      this.#probes.delete(probe.id);
      this.#publish();
    };
  }

  probes(): DebugProbe[] {
    return [...this.#probes.values()];
  }

  /** Every probe's current value, in one pass. */
  read(): Record<string, number | string> {
    const values: Record<string, number | string> = {};
    for (const probe of this.#probes.values()) {
      values[probe.id] = probe.read();
    }

    return values;
  }

  /** Fires on registration changes only, never on values. */
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  #publish(): void {
    for (const listener of this.#listeners) {
      listener();
    }
  }
}
