//
// Copyright 2024 DXOS.org
//

import { LegacySpaceProperties, SpaceProperties } from '@dxos/client-protocol';
import { Type } from '@dxos/echo';
import { Filter, type SerializedSpace, Serializer, decodeDXNFromJSON } from '@dxos/echo-db';
import { type EchoDatabase } from '@dxos/echo-db';

export type ImportSpaceOptions = {
  /** Type names to filter out during import (e.g., SpaceProperties typename). */
  ignoreTypes?: string[];
};

export const importSpace = async (db: EchoDatabase, data: SerializedSpace, options?: ImportSpaceOptions) => {
  const [properties] = await db
    .query(Filter.or(Filter.type(SpaceProperties), Filter.type(LegacySpaceProperties)))
    .run();

  await new Serializer().import(db, data, {
    onObject: async (object) => {
      const typeDXN = decodeDXNFromJSON(object['@type']);
      const typename = typeDXN?.asTypeDXN()?.type;

      if (typename && options?.ignoreTypes?.includes(typename)) {
        return false;
      }

      // Skip SpaceProperties when the target space already has them.
      if (
        properties &&
        (typename === Type.getTypename(SpaceProperties) || typename === Type.getTypename(LegacySpaceProperties))
      ) {
        return false;
      }
      return true;
    },
  });
};
