//
// Copyright 2024 DXOS.org
//

import { getSchema, type ExpandoType, getEchoObjectAnnotation } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { TypeOfExpando } from './file-serializer';
import { serializers } from './serializers';

/**
 * @deprecated Workaround for ECHO not supporting clone.
 */
export const clone = async (object: ExpandoType) => {
  const schema = getSchema(object);
  const typename = schema ? getEchoObjectAnnotation(schema)?.typename ?? TypeOfExpando : TypeOfExpando;
  const serializer = serializers[typename] ?? serializers.default;
  invariant(serializer, `No serializer for type: ${typename}`);
  const data = await serializer.serialize(object);
  return serializer.deserialize(data);
};
