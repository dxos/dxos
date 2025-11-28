//
// Copyright 2024 DXOS.org
//

import { SpaceProperties } from '@dxos/client-protocol';
import { Type } from '@dxos/echo';
import { type EchoDatabase, Filter, type SerializedSpace, Serializer, decodeReferenceJSON } from '@dxos/echo-db';

export const importSpace = async (database: EchoDatabase, data: SerializedSpace) => {
  const [properties] = await database.query(Filter.type(SpaceProperties)).run();

  await new Serializer().import(database, data, {
    onObject: async (object) => {
      const { '@type': typeEncoded, ...data } = object;
      const type = decodeReferenceJSON(typeEncoded);
      // Handle Space Properties.
      if (properties && type?.objectId === Type.getTypename(SpaceProperties)) {
        Object.entries(data).forEach(([name, value]) => {
          if (!name.startsWith('@')) {
            properties[name] = value;
          }
        });
        return false;
      }
      return true;
    },
  });
};
