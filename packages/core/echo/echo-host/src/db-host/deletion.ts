//
// Copyright 2026 DXOS.org
//

import { EncodedReference, type EntityStructure } from '@dxos/echo-protocol';
import { EID, type EntityId, type SpaceId } from '@dxos/keys';

/**
 * Depth bound for the transitive walk. Mirrors `ObjectCore.isDeleted`, which caps the same
 * traversal — the two must agree, or an object queries as deleted yet survives collection.
 */
const MAX_DELETION_DEPTH = 10;

/**
 * Resolves whether entities are deleted, including the transitive rule.
 *
 * Deletion cascades are computed at read time, never written: a child of a deleted parent, and a
 * relation with a deleted endpoint, carry no `deleted` flag of their own yet query as deleted
 * (`ObjectCore.isDeleted`). Garbage collection has to apply the same rule, or those entities are
 * invisible to every query while their documents are retained forever.
 *
 * Memoized across the whole pass: the walk revisits shared parents constantly, and the memo also
 * carries the cycle guard.
 */
export class DeletionResolver {
  readonly #structures = new Map<EntityId, EntityStructure>();
  readonly #memo = new Map<EntityId, boolean>();
  readonly #spaceId: SpaceId;

  constructor(spaceId: SpaceId) {
    this.#spaceId = spaceId;
  }

  /** Registers the entities of one document so the walk can resolve references into it. */
  add(objects: Record<string, EntityStructure> | undefined): void {
    for (const [objectId, structure] of Object.entries(objects ?? {})) {
      this.#structures.set(objectId as EntityId, structure);
    }
    this.#memo.clear();
  }

  has(objectId: string): boolean {
    return this.#structures.has(objectId as EntityId);
  }

  isDeleted(objectId: string): boolean {
    return this.#isDeleted(objectId as EntityId, MAX_DELETION_DEPTH);
  }

  #isDeleted(objectId: EntityId, remainingDepth: number): boolean {
    const cached = this.#memo.get(objectId);
    if (cached !== undefined) {
      return cached;
    }
    // Provisional `false` breaks reference cycles; the real value overwrites it below.
    this.#memo.set(objectId, false);

    const structure = this.#structures.get(objectId);
    if (!structure) {
      return false;
    }

    let deleted = structure.system?.deleted ?? false;
    if (!deleted && remainingDepth > 0) {
      const dependencies = [structure.system?.parent];
      if (structure.system?.kind === 'relation') {
        dependencies.push(structure.system?.source, structure.system?.target);
      }
      deleted = dependencies.some((reference) => {
        const dependencyId = reference && this.#resolveLocal(reference);
        return dependencyId ? this.#isDeleted(dependencyId, remainingDepth - 1) : false;
      });
    }

    this.#memo.set(objectId, deleted);
    return deleted;
  }

  /** References leaving this space, or resolving to nothing, count as not deleted. */
  #resolveLocal(reference: EncodedReference): EntityId | undefined {
    const uri = EncodedReference.toURI(reference);
    if (!EID.isEID(uri)) {
      return undefined;
    }
    const referencedSpaceId = EID.getSpaceId(uri);
    if (referencedSpaceId !== undefined && referencedSpaceId !== this.#spaceId) {
      return undefined;
    }
    return EID.getEntityId(uri);
  }
}
