//
// Copyright 2025 DXOS.org
//

import { useMemo } from 'react';

import { Capabilities } from '@dxos/app-framework';
import { useCapabilities } from '@dxos/app-framework/react';
import { type Space } from '@dxos/client/echo';
import { Filter, Obj } from '@dxos/echo';
import { type ReferencesProvider } from '@dxos/react-ui-chat';

/**
 * Resolve references to objects in the space.
 */
export const useReferencesProvider = (space?: Space): ReferencesProvider | undefined => {
  const blueprints = useCapabilities(Capabilities.BlueprintDefinition);

  return useMemo<ReferencesProvider | undefined>((): ReferencesProvider | undefined => {
    if (!space) {
      return undefined;
    }

    return {
      getReferences: async ({ query }) => {
        // TODO(burdon): Previously we filtered by types declared by the artifact definitions.
        // const schemas = blueprints.map((blueprint) => blueprint.schema).flat();
        // const { objects } = await space.db
        //   .query(Filter.or(...schemas.map((schema) => Filter.type(schema as Type.Schema))))
        //   .run();

        const { objects } = await space.db.query(Filter.everything()).run();

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
              uri: Obj.getDXN(object as any).toString(),
              label: Obj.getLabel(object as any) ?? '',
            }))
        );
      },
      resolveReference: async ({ uri }) => {
        const object = await space.db.query(Filter.ids(uri)).first();
        return { uri, label: Obj.getLabel(object) ?? '' };
      },
    } satisfies ReferencesProvider;
  }, [space, blueprints]);
};

const stringMatch = (query: string, label: string) => label.toLowerCase().startsWith(query.toLowerCase());
