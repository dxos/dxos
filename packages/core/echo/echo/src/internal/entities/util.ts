//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { assertArgument, invariant } from '@dxos/invariant';
import { DXN, ObjectId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import { type InternalObjectProps, SelfDXNId } from './model';

/**
 * Returns a DXN for an object or schema.
 *
 * @internal
 */
export const getObjectDXN = (object: any): DXN | undefined => {
  invariant(!Schema.isSchema(object), 'schema not allowed in this function');
  assertArgument(typeof object === 'object' && object != null, 'object', 'expected object');
  assumeType<InternalObjectProps>(object);

  if (object[SelfDXNId]) {
    invariant(object[SelfDXNId] instanceof DXN, 'Invalid object model: invalid self dxn');
    return object[SelfDXNId];
  }

  if (!ObjectId.isValid(object.id)) {
    throw new TypeError('Object id is not valid.');
  }

  return DXN.fromLocalObjectId(object.id);
};
