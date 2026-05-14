//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { assertArgument, invariant } from '@dxos/invariant';
import { EchoId, ObjectId, type URI } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import { type InternalObjectProps, SelfDXNId } from './model';

/**
 * Returns a DXN for an object or schema.
 *
 * @internal
 */
export const getObjectDXN = (object: any): URI.URI | undefined => {
  invariant(!Schema.isSchema(object), 'schema not allowed in this function');
  assertArgument(typeof object === 'object' && object != null, 'object', 'expected object');
  assumeType<InternalObjectProps>(object);

  if (object[SelfDXNId]) {
    invariant(typeof object[SelfDXNId] === 'string', 'Invalid object model: invalid self dxn');
    return object[SelfDXNId] as URI.URI;
  }

  if (!ObjectId.isValid(object.id)) {
    throw new TypeError('Object id is not valid.');
  }

  return EchoId.fromLocalObjectId(object.id);
};
