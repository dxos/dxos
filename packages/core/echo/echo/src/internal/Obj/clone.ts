//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { assumeType, deepMapValues } from '@dxos/util';

import type * as Obj from '../../Obj';
import { makeObject } from '../common/proxy';
import { ParentId, getSchema, getStaticTypeSchema, getType } from '../common/types';
import { getMeta } from '../common/types/meta';
import { type InternalObjectProps } from '../Entity/model';
import { Ref } from '../Ref';

/**
 * Clones an object or relation.
 * By default this does not clone referenced objects, only the properties in the object; pass `opts.deep`
 * to recurse into refs (see {@link Obj.CloneOptions}).
 * @returns A new object with the same schema and properties.
 */
export const clone = <T extends Obj.Any>(obj: T, opts?: Obj.CloneOptions): T => cloneInner(obj, opts, obj);

const cloneInner = <T extends Obj.Any>(obj: T, opts: Obj.CloneOptions | undefined, root: Obj.Any): T => {
  const { id, ...data } = obj;
  // Prefer cloning through the type entity so the cloned instance preserves
  // `Obj.getType` identity. Falls back to the raw schema for older instances
  // that don't have a type-entity back-reference set (e.g. deserialized).
  const typeEntity = getType(obj);
  const schema = typeEntity != null ? getStaticTypeSchema(typeEntity) : getSchema(obj);
  invariant(schema != null, 'Object should have a type or schema');

  const mapRef = (value: unknown, recurse: (value: unknown) => unknown): unknown => {
    if (Ref.isRef(value)) {
      const target = value.target;
      // TODO(dmaretskyi): Will break on circular references.
      if (target != null && (opts?.deep === 'all' || (opts?.deep === 'owned' && isOwnedBy(target, root)))) {
        return Ref.make(cloneInner(target, opts, root));
      }
      return value;
    }
    return recurse(value);
  };

  const props: any = deepMapValues(data, mapRef);
  if (opts?.retainId) {
    props.id = id;
  }
  const meta = deepMapValues(getMeta(obj), mapRef);

  return makeObject(schema, props, meta, typeEntity as object | undefined);
};

/**
 * Whether `entity`'s parent chain reaches `root` — i.e. it is an owned descendant that cascade-deletes with
 * the root. Walks the `ParentId` back-links (a finite tree); guarded against cycles defensively.
 */
const isOwnedBy = (entity: unknown, root: Obj.Any): boolean => {
  const seen = new Set<InternalObjectProps>();
  assumeType<InternalObjectProps>(entity);
  let parent = entity[ParentId];
  while (parent != null && !seen.has(parent)) {
    if (parent.id === root.id) {
      return true;
    }
    seen.add(parent);
    parent = parent[ParentId];
  }
  return false;
};
