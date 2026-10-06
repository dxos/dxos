//
// Copyright 2026 DXOS.org
//

import { type Trigger } from '#types';

/**
 * The agents' active triggers, held in process memory (docs/ONTOLOGY.md §5): they are lost when the
 * process restarts, and on EDGE they are only seen by agent processes in the same isolate. Promote
 * them to ECHO objects once their shape settles.
 */
/**
 * Most triggers the process holds at once: ongoing triggers never fire away, so without a cap the
 * registry (and the end-of-turn scan over it) would grow with every watch an agent is asked for.
 */
export const MAX_TRIGGERS = 256;

export class TriggerRegistry {
  #triggers: readonly Trigger.Trigger[] = [];
  readonly #listeners = new Set<() => void>();

  /** Every trigger, oldest first; the same array until the registry changes, so React can subscribe. */
  get snapshot(): readonly Trigger.Trigger[] {
    return this.#triggers;
  }

  /** The agent's triggers, oldest first. */
  list(agentId: string): Trigger.Trigger[] {
    return this.#triggers.filter((trigger) => trigger.agent === agentId);
  }

  get(id: string): Trigger.Trigger | undefined {
    return this.#triggers.find((trigger) => trigger.id === id);
  }

  /** Whether a new trigger would exceed {@link MAX_TRIGGERS}. */
  get isFull(): boolean {
    return this.#triggers.length >= MAX_TRIGGERS;
  }

  /** Adds or replaces the trigger; false (and unchanged) when it is new and the registry is full. */
  add(trigger: Trigger.Trigger): boolean {
    const others = this.#triggers.filter(({ id }) => id !== trigger.id);
    if (others.length >= MAX_TRIGGERS) {
      return false;
    }
    this.#set([...others, trigger]);
    return true;
  }

  /** Removes the trigger; false when there was none. */
  remove(id: string): boolean {
    const next = this.#triggers.filter((trigger) => trigger.id !== id);
    if (next.length === this.#triggers.length) {
      return false;
    }
    this.#set(next);
    return true;
  }

  /** Calls `listener` after every change; returns the unsubscribe. */
  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  #set(triggers: readonly Trigger.Trigger[]): void {
    this.#triggers = triggers;
    this.#listeners.forEach((listener) => listener());
  }
}

/** The process's registry, shared by the operations that write it and the UI that lists it. */
export const triggerRegistry = new TriggerRegistry();
