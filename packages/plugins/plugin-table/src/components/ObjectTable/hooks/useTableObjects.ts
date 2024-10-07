//
// Copyright 2024 DXOS.org
//

import { type EchoReactiveObject, type S } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { type Space, useQuery, Filter } from '@dxos/react-client/echo';

/**
 * Retrieves objects for a given schema and filters them using a global filter.
 *
 * @param {Space} space - The space to query objects from.
 * @param {S.Schema<any>} schema - The schema to filter objects by. If not provided, no objects will be returned.
 *
 * @returns {EchoReactiveObject<any>[]} - The filtered objects.
 */
export const useTableObjects = (space?: Space, schema?: S.Schema<any>) => {
  const objects = useQuery<EchoReactiveObject<any>>(
    space,
    schema ? Filter.schema(schema) : () => false,
    undefined,
    // TODO(burdon): Toggle deleted.
    [schema],
  );

  return useGlobalFilteredObjects(objects);
};
