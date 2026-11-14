//
// Copyright 2026 DXOS.org
//

import * as Type from '../../Type.ts';
import { endpointOf } from './identity.ts';
import { type AnyLens } from './types.ts';
import { isVersionLens, versionEdge } from './versions.ts';

/**
 * The lenses a registry holds, by name. There is at most one lens per pair of types: adding the same lens
 * again (an equal digest) replaces it, and adding a different one for a registered pair throws, as does
 * adding a lens between two versions of one type that version documents cannot run.
 */
export class LensSet {
  readonly #byName = new Map<string, AnyLens>();

  add(lens: AnyLens): void {
    if (isVersionLens(lens)) {
      // A lens between two versions of one type translates version documents, so only the subset that can.
      versionEdge(lens);
    }
    const existing = this.#byName.get(lens.name);
    if (existing && existing.digest !== lens.digest) {
      throw new TypeError(`Lens: a different lens is already registered for ${lens.name}.`);
    }
    this.#byName.set(lens.name, lens);
  }

  /** Removes the lens with entity id `id`; whether there was one. */
  remove(id: string): boolean {
    const lens = [...this.#byName.values()].find((candidate) => candidate.id === id);
    return lens !== undefined && this.#byName.delete(lens.name);
  }

  clear(): void {
    this.#byName.clear();
  }

  values(): AnyLens[] {
    return [...this.#byName.values()];
  }
}

/** `lenses` with each of `local` replacing the one of the same name. */
export const shadow = (lenses: readonly AnyLens[], local: readonly AnyLens[]): AnyLens[] => [
  ...new Map([...lenses, ...local].map((lens) => [lens.name, lens])).values(),
];

/** The lens among `lenses` from the type with URI `source` to the one named `target`. */
export const between = (lenses: readonly AnyLens[], source: string, target: string): AnyLens | undefined =>
  lenses.find((lens) => Type.getURI(lens.source) === source && endpointOf(lens.target) === target);

/** The lenses among `lenses` whose source is the type with URI `source`. */
export const from = (lenses: readonly AnyLens[], source: string): AnyLens[] =>
  lenses.filter((lens) => Type.getURI(lens.source) === source);
