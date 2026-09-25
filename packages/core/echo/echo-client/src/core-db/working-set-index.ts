//
// Copyright 2026 DXOS.org
//

import { EncodedReference, EntityStructure } from '@dxos/echo-protocol';
import { EID } from '@dxos/keys';

import type { ObjectCore } from './object-core.ts';

/** The links an object points along, by the id of the object at the other end. */
type Links = { parent?: string; source?: string; target?: string };

export type WorkingSetLink = keyof Links;

/**
 * Reverse links of a space's loaded objects: parent to children, and relation endpoint to relations.
 *
 * Kept current as cores change, so a traversal costs the size of its result rather than a scan of
 * the whole working set — a live query re-runs its traversals on every database update. Holds ids,
 * not cores: resolving them against the working set drops any collected since.
 */
export class WorkingSetIndex {
  readonly #links = new Map<string, Links>();
  readonly #reverse: Record<WorkingSetLink, Map<string, Set<string>>> = {
    parent: new Map(),
    source: new Map(),
    target: new Map(),
  };

  /** Re-reads a core's links; cheap enough to call on every change it might carry. */
  update(core: ObjectCore): void {
    const structure = core.isBodyAvailable ? core.getObjectStructure() : undefined;
    const next: Links = structure ? linksOf(structure) : {};
    const previous = this.#links.get(core.id) ?? {};
    for (const link of LINKS) {
      if (previous[link] !== next[link]) {
        this.#unlink(link, previous[link], core.id);
        this.#link(link, next[link], core.id);
      }
    }
    if (next.parent === undefined && next.source === undefined && next.target === undefined) {
      this.#links.delete(core.id);
    } else {
      this.#links.set(core.id, next);
    }
  }

  remove(id: string): void {
    const previous = this.#links.get(id);
    if (!previous) {
      return;
    }
    for (const link of LINKS) {
      this.#unlink(link, previous[link], id);
    }
    this.#links.delete(id);
  }

  clear(): void {
    this.#links.clear();
    for (const link of LINKS) {
      this.#reverse[link].clear();
    }
  }

  /** Ids of the objects whose `link` points at any of `ids`. */
  linkedTo(link: WorkingSetLink, ids: Iterable<string>): string[] {
    const result: string[] = [];
    for (const id of ids) {
      for (const from of this.#reverse[link].get(id) ?? []) {
        result.push(from);
      }
    }
    return result;
  }

  #link(link: WorkingSetLink, to: string | undefined, from: string): void {
    if (to === undefined) {
      return;
    }
    let set = this.#reverse[link].get(to);
    if (!set) {
      set = new Set();
      this.#reverse[link].set(to, set);
    }
    set.add(from);
  }

  #unlink(link: WorkingSetLink, to: string | undefined, from: string): void {
    if (to === undefined) {
      return;
    }
    const set = this.#reverse[link].get(to);
    set?.delete(from);
    if (set?.size === 0) {
      this.#reverse[link].delete(to);
    }
  }
}

const LINKS: readonly WorkingSetLink[] = ['parent', 'source', 'target'];

const linksOf = (structure: EntityStructure): Links => {
  const isRelation = EntityStructure.getEntityKind(structure) === 'relation';
  return {
    parent: entityIdOf(EntityStructure.getParent(structure)),
    source: isRelation ? entityIdOf(EntityStructure.getRelationSource(structure)) : undefined,
    target: isRelation ? entityIdOf(EntityStructure.getRelationTarget(structure)) : undefined,
  };
};

const entityIdOf = (ref: EncodedReference | undefined): string | undefined => {
  if (!ref || !EncodedReference.isEncodedReference(ref)) {
    return undefined;
  }
  const eid = EID.tryParse(EncodedReference.toURI(ref));
  return eid ? EID.getEntityId(eid) : undefined;
};
