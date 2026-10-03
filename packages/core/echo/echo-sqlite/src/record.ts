//
// Copyright 2026 DXOS.org
//

import { Entity, Obj, Ref, Relation, Type } from '@dxos/echo';
import { ATTR_PARENT, getRefSavedTarget } from '@dxos/echo/internal';
import { EID, type SpaceId } from '@dxos/keys';

/**
 * Everything written for one entity: its row, its outgoing references and its searchable text.
 */
export type EntityRecord = {
  readonly id: string;
  readonly kind: string;
  readonly typeDxn: string;
  readonly deleted: boolean;
  readonly parentId: string | null;
  readonly sourceId: string | null;
  readonly targetId: string | null;
  readonly body: Record<string, unknown>;
  readonly refs: readonly { readonly path: string; readonly targetId: string }[];
  readonly text: string;
};

/** Top-level JSON keys that are system annotations, not data a reference or search should see. */
const SYSTEM_KEYS = new Set(['id', '@type', '@uri', '@parent', '@relationSource', '@relationTarget', '@deleted']);

/**
 * Serializes a live entity into the columns, reference rows and text the store writes.
 */
export const toRecord = (entity: Entity.Unknown, spaceId: SpaceId): EntityRecord => {
  const foreign = foreignTargets(entity, spaceId);
  const body = qualifyReferences({ ...Entity.toJSON(entity) }, foreign);
  const parent = Obj.isObject(entity) ? Obj.getParent(entity) : undefined;
  if (parent) {
    body[ATTR_PARENT] = EID.make({ entityId: parent.id });
  }

  const refs: { path: string; targetId: string }[] = [];
  const strings: string[] = [];
  const visit = (value: unknown, path: readonly string[]): void => {
    if (typeof value === 'string') {
      strings.push(value);
    } else if (Array.isArray(value)) {
      // Array positions are not part of the path: the query AST names the property, not the slot.
      value.forEach((item) => visit(item, path));
    } else if (value !== null && typeof value === 'object') {
      const uri = (value as Record<string, unknown>)['/'];
      if (typeof uri === 'string' && Object.keys(value).length === 1) {
        const targetId = localEntityId(uri, spaceId);
        if (targetId && path.length > 0) {
          refs.push({ path: path.join('.'), targetId });
        }
        return;
      }
      for (const [key, inner] of Object.entries(value)) {
        visit(inner, [...path, key]);
      }
    }
  };
  for (const [key, value] of Object.entries(body)) {
    if (SYSTEM_KEYS.has(key)) {
      continue;
    }
    if (key === '@meta') {
      // Meta is searchable but its tags are not data references.
      visitStrings(value, strings);
      continue;
    }
    visit(value, [key]);
  }

  const isRelation = Relation.isRelation(entity);
  return {
    id: entity.id,
    kind: Type.isType(entity) ? Entity.Kind.Type : isRelation ? Entity.Kind.Relation : Entity.Kind.Object,
    typeDxn: Entity.getTypeURI(entity) ?? '',
    deleted: Entity.isDeleted(entity),
    parentId: parent?.id ?? null,
    sourceId: isRelation ? localEntityId(qualify(Relation.getSourceURI(entity), foreign), spaceId) : null,
    targetId: isRelation ? localEntityId(qualify(Relation.getTargetURI(entity), foreign), spaceId) : null,
    body,
    refs,
    text: strings.join('\n'),
  };
};

/**
 * Absolute URIs for the relative ones in `entity` whose live target belongs to another database. A ref
 * built with `Ref.make` names its target relative to wherever it lives, which read back from this space
 * would point into it; the row must name the target's own space.
 */
const foreignTargets = (entity: Entity.Unknown, spaceId: SpaceId): Map<string, string> => {
  const foreign = new Map<string, string>();
  const note = (uri: string, target: unknown): void => {
    const eid = EID.tryParse(uri);
    const targetSpace = Entity.isEntity(target) ? Entity.getDatabase(target)?.spaceId : undefined;
    if (eid && EID.isLocal(eid) && targetSpace !== undefined && targetSpace !== spaceId && Entity.isEntity(target)) {
      foreign.set(uri, EID.make({ spaceId: targetSpace, entityId: target.id }));
    }
  };
  const visit = (value: unknown): void => {
    if (Ref.isRef(value)) {
      note(value.uri, getRefSavedTarget(value));
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (value !== null && typeof value === 'object') {
      Object.values(value).forEach(visit);
    }
  };
  visit(Object.values(entity));
  if (Relation.isRelation(entity)) {
    note(Relation.getSourceURI(entity), Relation.getSource(entity));
    note(Relation.getTargetURI(entity), Relation.getTarget(entity));
  }
  return foreign;
};

const qualify = (uri: string, foreign: ReadonlyMap<string, string>): string => foreign.get(uri) ?? uri;

/** Rewrites encoded references (`{ "/": uri }`) and endpoint URIs to their absolute form. */
const qualifyReferences = (
  body: Record<string, unknown>,
  foreign: ReadonlyMap<string, string>,
): Record<string, unknown> => {
  if (foreign.size === 0) {
    return body;
  }
  const rewrite = (value: unknown): unknown => {
    if (Array.isArray(value)) {
      return value.map(rewrite);
    }
    if (value !== null && typeof value === 'object') {
      const uri = Object.keys(value).length === 1 ? Object.getOwnPropertyDescriptor(value, '/')?.value : undefined;
      if (typeof uri === 'string') {
        return { '/': qualify(uri, foreign) };
      }
      return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, rewrite(inner)]));
    }
    return value;
  };
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key,
      ENDPOINT_KEYS.has(key) && typeof value === 'string' ? qualify(value, foreign) : rewrite(value),
    ]),
  );
};

const ENDPOINT_KEYS = new Set(['@relationSource', '@relationTarget']);

/**
 * The bare entity id of an `echo:` URI that is local to `spaceId` (or space-relative), else null.
 */
export const localEntityId = (uri: string, spaceId: SpaceId): string | null => {
  const eid = EID.tryParse(uri);
  if (!eid) {
    return null;
  }
  const uriSpace = EID.getSpaceId(eid);
  return uriSpace === undefined || uriSpace === spaceId ? (EID.getEntityId(eid) ?? null) : null;
};

const visitStrings = (value: unknown, out: string[]): void => {
  if (typeof value === 'string') {
    out.push(value);
  } else if (value !== null && typeof value === 'object') {
    Object.values(value).forEach((inner) => visitStrings(inner, out));
  }
};
