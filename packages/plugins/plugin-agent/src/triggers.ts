//
// Copyright 2026 DXOS.org
//

import { type Trigger } from '#types';

/**
 * The agents' active triggers, held in process memory (docs/ONTOLOGY.md §5): they are lost when the
 * process restarts, and on EDGE they are only seen by agent processes in the same isolate. Promote
 * them to ECHO objects once their shape settles.
 */
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

  add(trigger: Trigger.Trigger): void {
    this.#set([...this.#triggers.filter(({ id }) => id !== trigger.id), trigger]);
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
