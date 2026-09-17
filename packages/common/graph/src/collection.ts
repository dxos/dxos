//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import type * as Registry from 'effect/unstable/reactivity/AtomRegistry';

import * as GraphNode from './GraphNode.ts';

/** A node to keep loaded with its structural descendants to `depth` levels, or all of them when absent. */
export type Region = { readonly id: string; readonly depth?: number };

/** What a connector last emitted: the node it expands, its direct outputs, and their inline descendants. */
export type ConnectorState = {
  readonly key: string;
  readonly source: string;
  readonly outputs: readonly string[];
  readonly inline: readonly string[];
};

/** Whether releasing `released` leaves the connector's diff state naming nodes that are gone, so it must be torn down. */
export const tornDown = (released: ReadonlySet<string>, { source, outputs, inline }: ConnectorState): boolean =>
  released.has(source) || outputs.some((id) => released.has(id)) || inline.some((id) => released.has(id));

/** The deepest depth any answer asks for each node, keyed by id. */
export const combine = (answers: Iterable<readonly Region[]>): Map<string, number> => {
  const asked = new Map<string, number>();
  for (const regions of answers) {
    for (const { id, depth = Infinity } of regions) {
      asked.set(id, Math.max(asked.get(id) ?? -1, depth));
    }
  }
  return asked;
};

/** A stable key for a combined ask, so an unchanged answer skips collection. */
export const key = (asked: ReadonlyMap<string, number>): string =>
  JSON.stringify([...asked].map(([id, depth]) => [id, String(depth)]).sort());

export type UnretainedProps = {
  readonly asked: ReadonlyMap<string, number>;
  readonly outgoing: (id: string) => Iterable<{ readonly target: string; readonly relation: string }>;
  readonly structural: (relation: string) => boolean;
  readonly connectors: Iterable<ConnectorState>;
};

/**
 * Walks the graph from the root, which always stays with its children, carrying how many structural levels
 * each node's retention leaves below it. A node reached with none left is unretained, and so is everything
 * it alone leads to; inline descendants stay while the connector that emitted them would otherwise survive.
 */
export const unretained = ({ asked, outgoing, structural, connectors }: UnretainedProps): Set<string> => {
  const budgets = new Map([[GraphNode.RootId, Math.max(1, asked.get(GraphNode.RootId) ?? 1)]]);
  const pending = [GraphNode.RootId];
  for (let id = pending.pop(); id !== undefined; id = pending.pop()) {
    const budget = budgets.get(id) ?? -1;
    for (const { target, relation } of outgoing(id)) {
      const step = structural(relation) ? 1 : 0;
      const next = budget < 0 ? -1 : Math.max(-1, budget - step, asked.get(target) ?? -1);
      const current = budgets.get(target);
      if (current === undefined || next > current) {
        budgets.set(target, next);
        pending.push(target);
      }
    }
  }

  const released = new Set([...budgets].filter(([, budget]) => budget < 0).map(([id]) => id));
  const states = [...connectors];
  let kept = true;
  while (kept) {
    kept = false;
    for (const state of states) {
      if (!tornDown(released, { ...state, inline: [] })) {
        for (const id of state.inline) {
          kept = released.delete(id) || kept;
        }
      }
    }
  }
  return released;
};

/**
 * Released ids no connector has produced since, keyed by the connector that last emitted them, so a caller
 * missing a node can tell one being rebuilt from one that may never arrive.
 */
export class Released {
  readonly #connectorOf = new Map<string, string>();
  readonly #byConnector = new Map<string, { source: string; ids: Set<string> }>();
  readonly #version = Atom.make(0).pipe(Atom.keepAlive);

  constructor(private readonly _registry: Registry.AtomRegistry) {}

  /** Changes whenever {@link Released.has} may answer differently. */
  get version(): Atom.Atom<number> {
    return this.#version;
  }

  has(id: string): boolean {
    return this.#connectorOf.has(id);
  }

  /** Records the ids in `released` that a connector emitted; ids no connector produced are not coming back. */
  add(released: ReadonlySet<string>, connectors: Iterable<ConnectorState>): void {
    for (const { key, source, outputs, inline } of connectors) {
      for (const id of [...outputs, ...inline]) {
        if (released.has(id)) {
          this.#forget(id);
          this.#connectorOf.set(id, key);
          const entry = this.#byConnector.get(key) ?? { source, ids: new Set<string>() };
          entry.ids.add(id);
          this.#byConnector.set(key, entry);
        }
      }
    }
    this.#bump();
  }

  /** The connector flushed: whatever it had emitted before is either back or gone for good. */
  flushed(key: string, emitted: readonly string[]): void {
    const entry = this.#byConnector.get(key);
    const stale = [...(entry?.ids ?? []), ...emitted.filter((id) => this.#connectorOf.has(id))];
    if (stale.length === 0) {
      return;
    }
    stale.forEach((id) => this.#forget(id));
    this.#bump();
  }

  /** `id` was removed rather than released, so nothing released below it is coming back. */
  removed(id: string): void {
    for (const { source, ids } of [...this.#byConnector.values()]) {
      if (source === id || source.startsWith(`${id}${GraphNode.PathSeparator}`)) {
        [...ids].forEach((released) => this.#forget(released));
      }
    }
  }

  #forget(id: string): void {
    const key = this.#connectorOf.get(id);
    if (key === undefined) {
      return;
    }
    this.#connectorOf.delete(id);
    const entry = this.#byConnector.get(key);
    entry?.ids.delete(id);
    if (entry?.ids.size === 0) {
      this.#byConnector.delete(key);
    }
  }

  #bump(): void {
    this._registry.update(this.#version, (version) => version + 1);
  }
}
