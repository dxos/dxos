//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { assertArgument, invariant } from '@dxos/invariant';
import { EchoId, ObjectId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import { type InternalObjectProps, SelfDXNId } from './model';

/**
 * Returns the EchoId of an object.
 * Normalizes any legacy `dxn:echo:` / `dxn:queue:` form stored in `SelfDXNId`.
 *
 * @internal
 */
export const getObjectEchoId = (object: any): EchoId.EchoId | undefined => {
  invariant(!Schema.isSchema(object), 'schema not allowed in this function');
  assertArgument(typeof object === 'object' && object != null, 'object', 'expected object');
  assumeType<InternalObjectProps>(object);

  if (object[SelfDXNId]) {
    invariant(typeof object[SelfDXNId] === 'string', 'Invalid object model: invalid self dxn');
    return EchoId.parse(object[SelfDXNId]);
  }

  if (!ObjectId.isValid(object.id)) {
    throw new TypeError('Object id is not valid.');
  }

  return EchoId.fromLocalObjectId(object.id);
};
