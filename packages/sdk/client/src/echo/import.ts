//
// Copyright 2024 DXOS.org
//

import { SpaceProperties } from '@dxos/client-protocol';
import { DXN, Filter, Type } from '@dxos/echo';
import { type EchoDatabase, type SerializedSpace, Serializer, decodeDXNFromJSON } from '@dxos/echo-client';

export type ImportSpaceOptions = {
  /** Type names to filter out during import (e.g., SpaceProperties typename). */
  ignoreTypes?: string[];
};

export const importSpace = async (db: EchoDatabase, data: SerializedSpace, options?: ImportSpaceOptions) => {
  const [properties] = await db.query(Filter.type(SpaceProperties)).run();

  await new Serializer().import(db, data, {
    onObject: async (object) => {
      const typeURI = decodeDXNFromJSON(object['@type']);
      const typename = typeURI && DXN.isDXN(typeURI) ? DXN.getName(typeURI) : undefined;
      if (typename && options?.ignoreTypes?.includes(typename)) {
        return false;
      }

      // Skip SpaceProperties when the target space already has them.
      if (properties && typename === Type.getTypename(SpaceProperties)) {
        return false;
      }
      return true;
    },
  });
};
