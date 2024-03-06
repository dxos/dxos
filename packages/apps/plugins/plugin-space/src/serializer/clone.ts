//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';
import { type TypedObject } from '@dxos/react-client/echo';

import { TypeOfExpando } from './file-serializer';
import { serializers } from './serializers';

/**
 * @deprecated Workaround for ECHO not supporting clone.
 */
export const clone = async (object: TypedObject) => {
  const typename = object.__typename ?? TypeOfExpando;
  const serializer = serializers[typename] ?? serializers.default;
  invariant(serializer, `No serializer for type: ${typename}`);
  const data = await serializer.serialize(object);
  return serializer.deserialize(data);
};
