import { DXN, ObjectId } from '@dxos/keys';
import { InternalObjectProps } from './model';
import { Schema } from 'effect';
import { assertArgument, invariant } from '@dxos/invariant';
import { assumeType } from '@dxos/util';

//
// Accessors based on model.
//

/**
 * Returns a DXN for an object or schema.
 */
export const getObjectDXN = (object: any): DXN | undefined => {
  invariant(!Schema.isSchema(object), 'schema not allowed in this function');
  assertArgument(typeof object === 'object' && object != null, 'expected object');
  assumeType<InternalObjectProps>(object);

  // TODO(dmaretskyi): Use SelfDXNId.

  if (!ObjectId.isValid(object.id)) {
    throw new TypeError('Object id is not valid.');
  }

  return DXN.fromLocalObjectId(object.id);
};
