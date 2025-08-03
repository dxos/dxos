//
// Copyright 2024 DXOS.org
//

import { TYPE_PROPERTIES } from '@dxos/client-protocol';
import type { EchoDatabase, SerializedSpace } from '@dxos/echo-db';
import { Filter, Serializer, decodeReferenceJSON } from '@dxos/echo-db';

export const importSpace = async (database: EchoDatabase, data: SerializedSpace) => {
  const {
    objects: [properties],
  } = await database.query(Filter.typename(TYPE_PROPERTIES)).run();

  await new Serializer().import(database, data, {
    onObject: async (object) => {
      const { '@type': typeEncoded, ...data } = object;
      const type = decodeReferenceJSON(typeEncoded);
      // Handle Space Properties
      if (properties && type?.objectId === TYPE_PROPERTIES) {
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
