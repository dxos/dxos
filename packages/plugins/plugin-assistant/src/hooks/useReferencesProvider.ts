//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { type Space } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { type ReferencesProvider } from '@dxos/react-ui-chat';

/**
 * Resolve references to objects in the space.
 */
export const useReferencesProvider = (space?: Space): ReferencesProvider | undefined => {
  return useMemo<ReferencesProvider | undefined>((): ReferencesProvider | undefined => {
    if (!space) {
      return undefined;
    }

    return {
      getReferences: async ({ query }) => {
        // TODO(burdon): Previously we filtered by types declared by the artifact definitions.
        // const schemas = skills.map((skill) => skill.schema).flat();
        // const objects = await space.db
        //   .query(Filter.or(...schemas.map((schema) => Filter.type(schema as Type.Schema))))
        //   .run();

        const objects = await space.db.query(Filter.everything()).run();

        return objects
          .filter(Obj.isObject)
          .filter((object) => stringMatch(query, Obj.getLabel(object) ?? ''))
          .map((object) => ({
            uri: Obj.getURI(object),
            label: Obj.getLabel(object) ?? '',
          }));
      },
      resolveReference: async ({ uri }) => {
        const object = await space.db.query(Filter.id(uri)).first();
        return { uri, label: Obj.getLabel(object) ?? '' };
      },
    } satisfies ReferencesProvider;
  }, [space]);
};

const stringMatch = (query: string, label: string) => label.toLowerCase().startsWith(query.toLowerCase());
