//
// Copyright 2025 DXOS.org
//

import type { Schema } from 'effect';
import { useMemo } from 'react';

import { Capabilities, useCapabilities } from '@dxos/app-framework';
import { Filter, type Space } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { type BaseEchoObject, getObjectDXN, getLabel } from '@dxos/echo-schema';
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
          .query(Filter.or(...artifactSchemas.map((schema) => Filter.type(schema as Schema.Schema<BaseEchoObject>))))
          .run();
        return (
          objects
            .map((object) => {
              log.info('object', { object, label: getLabel(Obj.getSchema(object)!, object) });
              return object;
            })
            .filter((object) => stringMatch(query, getLabel(Obj.getSchema(object)!, object) ?? ''))
            // TODO(dmaretskyi): `Type.getDXN` (at the point of writing) didn't work here as it was schema-only.
            .filter((object) => !!getObjectDXN(object))
            .map((object) => ({
              uri: getObjectDXN(object as any)!.toString(),
              label: getLabel(Obj.getSchema(object)!, object) ?? '',
            }))
        );
      },
      resolveMetadata: async ({ uri }) => {
        const object = await space.db.query(Filter.ids(uri)).first();
        return {
          uri,
          label: getLabel(Obj.getSchema(object)!, object) ?? '',
        };
      },
    };
  }, [space, artifactDefinitions]);
};
