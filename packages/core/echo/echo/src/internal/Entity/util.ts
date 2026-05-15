//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { assertArgument, invariant } from '@dxos/invariant';
import { EchoURI, ObjectId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import { type InternalObjectProps, SelfDXNId } from './model';

/**
 * Returns the EchoURI of an object.
 * Normalizes any legacy `dxn:echo:` / `dxn:queue:` form stored in `SelfDXNId`.
 *
 * @internal
 */
export const getObjectEchoId = (object: any): EchoURI.EchoURI | undefined => {
  invariant(!Schema.isSchema(object), 'schema not allowed in this function');
  assertArgument(typeof object === 'object' && object != null, 'object', 'expected object');
  assumeType<InternalObjectProps>(object);

  if (object[SelfDXNId]) {
    invariant(EchoURI.isEchoId(object[SelfDXNId]), 'Invalid object model: invalid self dxn');
    return EchoURI.parse(object[SelfDXNId]);
  }

  if (!ObjectId.isValid(object.id)) {
    throw new TypeError('Object id is not valid.');
  }

  return EchoURI.fromLocalObjectId(object.id);
};
