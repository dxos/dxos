//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { Filter, type Space } from '@dxos/client/echo';
import { Type } from '@dxos/echo';
import { getLabel } from '@dxos/echo-schema';
import { log } from '@dxos/log';

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
          .query(Filter.or(...artifactSchemas.map((schema) => Filter.type(schema))))
          .run();
        return objects
          .map((object) => {
            log.info('object', { object, label: getLabel(Type.getSchema(object)!, object) });
            return object;
          })
          .filter((object) => stringMatch(query, getLabel(Type.getSchema(object)!, object) ?? ''))
          .filter((object) => !!Type.getDXN(object))
          .map((object) => ({
            uri: Type.getDXN(object)!.toString(),
            label: getLabel(Type.getSchema(object)!, object) ?? '',
          }));
      },
      resolveMetadata: async ({ uri }) => {
        const object = await space.db.query({ id: uri }).first();
        return {
          uri,
          label: getLabel(Type.getSchema(object)!, object) ?? '',
        };
      },
    };
  }, [space, artifactDefinitions]);
};
