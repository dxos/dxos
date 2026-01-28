//
// Copyright 2026 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { deepMapValues } from '@dxos/util';

import type * as Obj from '../../Obj';
import { makeObject } from '../proxy';
import { Ref } from '../ref';
import { getMeta, getSchema } from '../types';

/**
 * Clones an object or relation.
 * This does not clone referenced objects, only the properties in the object.
 * @returns A new object with the same schema and properties.
 */
export const clone = <T extends Obj.Any>(obj: T, opts?: Obj.CloneOptions): T => {
  const { id, ...data } = obj;
  const schema = getSchema(obj);
  invariant(schema != null, 'Object should have a schema');
  const props: any = deepMapValues(data, (value, recurse) => {
    if (Ref.isRef(value)) {
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

  return makeObject(schema, props, meta);
};
