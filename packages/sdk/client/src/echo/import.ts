//
// Copyright 2024 DXOS.org
//

import { SpaceProperties } from '@dxos/client-protocol';
import { Obj, Type } from '@dxos/echo';
import { Filter, type SerializedSpace, Serializer, decodeDXNFromJSON } from '@dxos/echo-db';
import { type EchoDatabase } from '@dxos/echo-db';

export type ImportSpaceOptions = {
  /** Type names to filter out during import (e.g., SpaceProperties typename). */
  ignoreTypes?: string[];
};

export const importSpace = async (db: EchoDatabase, data: SerializedSpace, options?: ImportSpaceOptions) => {
  const [properties] = await db
    .query(Filter.type(SpaceProperties))
    .run();

  await new Serializer().import(db, data, {
    onObject: async (object) => {
      const { '@type': typeEncoded, ...data } = object;
      const typeDXN = decodeDXNFromJSON(typeEncoded);
      const typename = typeDXN?.asTypeDXN()?.type;

      if (typename && options?.ignoreTypes?.includes(typename)) {
        return false;
      }

      // Handle Space Properties.
      if (properties && typename === Type.getTypename(SpaceProperties)) {
        Obj.change(properties, (props: any) => {
          Object.entries(data).forEach(([name, value]) => {
            if (!name.startsWith('@')) {
              props[name] = value;
            }
          });
        });
        return false;
      }
      return true;
    },
  });
};
