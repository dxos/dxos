//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { assertArgument, invariant } from '@dxos/invariant';
import { EID, EntityId } from '@dxos/keys';
import { assumeType } from '@dxos/util';

import { type InternalObjectProps, SelfURIId } from './model';

/**
 * Returns the EID of an object.
 *
 * @internal
 */
export const getObjectEchoUri = (object: any): EID.EID | undefined => {
  invariant(!Schema.isSchema(object), 'schema not allowed in this function');
  assertArgument(typeof object === 'object' && object != null, 'object', 'expected object');
  assumeType<InternalObjectProps>(object);

  if (object[SelfURIId]) {
    invariant(EID.isEID(object[SelfURIId]), 'Invalid object model: invalid self dxn');
    return EID.parse(object[SelfURIId]);
  }

  if (!EntityId.isValid(object.id)) {
    throw new TypeError('Object id is not valid.');
  }

  return EID.make({ entityId: object.id });
};
