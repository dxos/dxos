//
// Copyright 2026 DXOS.org
//

import { Entity, Obj, Relation, Type } from '@dxos/echo';
import { ATTR_PARENT } from '@dxos/echo/internal';
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
  const body: Record<string, unknown> = { ...Entity.toJSON(entity) };
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
    sourceId: isRelation ? localEntityId(Relation.getSourceURI(entity), spaceId) : null,
    targetId: isRelation ? localEntityId(Relation.getTargetURI(entity), spaceId) : null,
    body,
    refs,
    text: strings.join('\n'),
  };
};

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
