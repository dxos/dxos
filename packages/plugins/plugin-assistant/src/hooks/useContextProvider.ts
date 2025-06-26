//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj, type Type } from '@dxos/echo';

export type ContextProvider = {
  query: (params: { query: string }) => Promise<Array<{ uri: string; label: string }>>;
  resolveMetadata: (params: { uri: string }) => Promise<{ uri: string; label: string }>;
};

const stringMatch = (query: string, label: string) => label.toLowerCase().startsWith(query.toLowerCase());

export const useContextProvider = (space?: Space): ContextProvider | undefined => {
  const artifactDefinitions = useCapabilities(Capabilities.ArtifactDefinition);

  return useMemo<ContextProvider | undefined>((): ContextProvider | undefined => {
    if (!space) {
      return undefined;
    }

    return {
      query: async ({ query }) => {
        const artifactSchemas = artifactDefinitions.map((artifact) => artifact.schema);
        const { objects } = await space.db
          .query(Filter.or(...artifactSchemas.map((schema) => Filter.type(schema as Type.Schema))))
          .run();

        return (
          objects
            // TODO(burdon): Remove cast ??? (+ two instances below).
            // .map((object) => {
            //   log.info('object', { object, label: Obj.getLabel(object as any) });
            //   return object;
            // })
            .filter((object) => stringMatch(query, Obj.getLabel(object as any) ?? ''))
            // TODO(dmaretskyi): `Type.getDXN` (at the point of writing) didn't work here as it was schema-only.
            .filter((object) => !!Obj.getDXN(object as Obj.Any))
            .map((object) => ({
              uri: Obj.getDXN(object as any)!.toString(),
              label: Obj.getLabel(object as any) ?? '',
            }))
        );
      },
      resolveMetadata: async ({ uri }) => {
        const object = await space.db.query(Filter.ids(uri)).first();
        return { uri, label: Obj.getLabel(object) ?? '' };
      },
    };
  }, [space, artifactDefinitions]);
};
