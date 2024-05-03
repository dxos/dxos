//
// Copyright 2024 DXOS.org
//

import { useFilteredObjects } from '@braneframe/plugin-search';
import { type EchoReactiveObject, type S } from '@dxos/echo-schema';
import { type Space, useQuery, Filter } from '@dxos/react-client/echo';

// TODO(Zan): Consolidate.
const Stable = {
  empty: {
    object: Object.freeze({}),
    array: Object.freeze([] as any[]),
  },
};

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
    Stable.empty.object,
    // TODO(burdon): Toggle deleted.
    [schema],
  );

  return useFilteredObjects(objects);
};
