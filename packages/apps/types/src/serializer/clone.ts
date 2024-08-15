//
// Copyright 2024 DXOS.org
//

import { getSchema, type Expando, getEchoObjectAnnotation, EXPANDO_TYPENAME } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { serializers } from './serializers';

/**
 * @deprecated Workaround for ECHO not supporting clone.
 */
// TODO(burdon): Remove.
export const cloneObject = async (object: Expando): Promise<Expando> => {
  const schema = getSchema(object);
  const typename = schema ? getEchoObjectAnnotation(schema)?.typename ?? EXPANDO_TYPENAME : EXPANDO_TYPENAME;
  const serializer = serializers[typename];
  invariant(serializer, `No serializer for type: ${typename}`);
  const content = await serializer.serialize({ object, serializers });
  return serializer.deserialize({ content, serializers, newId: true });
};
