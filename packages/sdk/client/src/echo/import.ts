//
// Copyright 2024 DXOS.org
//

import { LegacySpaceProperties, SpaceProperties } from '@dxos/client-protocol';
import { Obj, Type } from '@dxos/echo';
import { Filter, type SerializedSpace, Serializer, decodeDXNFromJSON } from '@dxos/echo-db';
import { type EchoDatabase } from '@dxos/echo-db';

export const importSpace = async (db: EchoDatabase, data: SerializedSpace) => {
  const [properties] = await db
    .query(Filter.or(Filter.type(SpaceProperties), Filter.type(LegacySpaceProperties)))
    .run();

  await new Serializer().import(db, data, {
    onObject: async (object) => {
      const { '@type': typeEncoded, ...data } = object;
      const typeDXN = decodeDXNFromJSON(typeEncoded);
      const typename = typeDXN?.asTypeDXN()?.type;
      // Handle Space Properties.
      if (
        properties &&
        (typename === Type.getTypename(SpaceProperties) || typename === Type.getTypename(LegacySpaceProperties))
      ) {
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
