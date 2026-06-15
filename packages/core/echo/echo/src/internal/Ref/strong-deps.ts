//
// Copyright 2026 DXOS.org
//

import { EID, type URI } from '@dxos/keys';

import { EntityKind } from '../common/types/entity';
import { RelationSourceDXNId, RelationTargetDXNId } from '../common/types/model-symbols';
import { ParentId, TypeId } from '../common/types/typename';
import { getObjectEchoUri } from '../Entity/util';

/**
 * Normalized view of the references that make up an entity's strong-dependency set, store-agnostic
 * so it can be filled from an {@link ObjectCore} (db) or a decoded entity (queue item / snapshot).
 */
export interface StrongDepRefs {
  /** Entity kind — relations additionally depend on their source/target. */
  kind: EntityKind;
  /** Type reference URI (`echo:` for a persisted stored schema, `dxn:` for a static/registry type). */
  type?: URI.URI;
  /** Relation source reference URI. */
  source?: URI.URI;
  /** Relation target reference URI. */
  target?: URI.URI;
  /** Parent reference URI. */
  parent?: URI.URI;
}

/**
 * Direct strong-dependency URIs of an entity: the schema (only when stored as an object), the
 * relation source/target, and the parent. Returns URIs (cross-space `echo:` EIDs and queue-item
 * EIDs included); a persisted schema is an `echo:` URI, a static/registry type is a `dxn:` URI.
 *
 * A static/registry type (`dxn:`) is intentionally NOT a strong dep: it is always synchronously
 * available through the registry, so gating on it would needlessly delay surfacing. Only a
 * persisted (db-backed) schema, addressed by an `echo:` URI, must load before its instances.
 */
export const getStrongDependencyUris = (refs: StrongDepRefs): URI.URI[] => {
  const res: URI.URI[] = [];

  if (refs.type != null && EID.tryParse(refs.type) != null) {
    res.push(refs.type);
  }

  if (refs.kind === EntityKind.Relation) {
    if (refs.source != null) {
      res.push(refs.source);
    }
    if (refs.target != null) {
      res.push(refs.target);
    }
  }

  if (refs.parent != null) {
    res.push(refs.parent);
  }

  return res;
};

/**
 * Direct strong-dependency URIs of a live (decoded) entity — a queue item, cross-space proxy, or
 * snapshot. Reads the reference URIs off the entity's hidden model symbols. ECHO db cores compute
 * the same set from their raw encoded references via {@link getStrongDependencyUris}.
 */
export const getStrongDependencies = (entity: unknown): URI.URI[] => {
  if (entity == null || typeof entity !== 'object') {
    return [];
  }
  const props = entity as Record<symbol, unknown>;
  const kind =
    props[RelationSourceDXNId] != null || props[RelationTargetDXNId] != null ? EntityKind.Relation : EntityKind.Object;
  const parent = props[ParentId];

  return getStrongDependencyUris({
    kind,
    type: typeof props[TypeId] === 'string' ? (props[TypeId] as URI.URI) : undefined,
    source: props[RelationSourceDXNId] as URI.URI | undefined,
    target: props[RelationTargetDXNId] as URI.URI | undefined,
    // A parent is held as the resolved entity; derive its absolute URI for the dependency edge.
    parent: parent != null ? getObjectEchoUri(parent) : undefined,
  });
};
