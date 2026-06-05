//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { deepMapValues } from '@dxos/util';

import type * as Obj from '../../Obj';
import { makeObject } from '../common/proxy';
import { getSchema, getStaticTypeSchema, getType } from '../common/types';
import { getMeta } from '../common/types/meta';
import { Ref } from '../Ref';

/**
 * Clones an object or relation.
 * This does not clone referenced objects, only the properties in the object.
 * @returns A new object with the same schema and properties.
 */
export const clone = <T extends Obj.Any>(obj: T, opts?: Obj.CloneOptions): T => {
  const { id, ...data } = obj;
  // Prefer cloning through the type entity so the cloned instance preserves
  // `Obj.getType` identity. Falls back to the raw schema for older instances
  // that don't have a type-entity back-reference set (e.g. deserialized).
  const typeEntity = getType(obj);
  const schema = typeEntity != null ? getStaticTypeSchema(typeEntity) : getSchema(obj);
  invariant(schema != null, 'Object should have a type or schema');
  const props: any = deepMapValues(data, (value, recurse) => {
    if (Ref.isRef(value)) {
      if (opts?.deep) {
        // TODO(dmaretskyi): Will break on circular references.
        return Ref.make(clone(value.target!, opts));
      }
      return value;
    }
    return recurse(value);
  });

  if (opts?.retainId) {
    props.id = id;
  }
  const meta = deepMapValues(getMeta(obj), (value, recurse) => {
    if (Ref.isRef(value)) {
      if (opts?.deep) {
        // TODO(dmaretskyi): Will break on circular references.
        return Ref.make(clone(value.target!, opts));
      }
      return value;
    }
    return recurse(value);
  });

  return makeObject(schema, props, meta, typeEntity as object | undefined);
};
