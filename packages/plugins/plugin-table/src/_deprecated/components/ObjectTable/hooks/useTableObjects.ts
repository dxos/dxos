//
// Copyright 2024 DXOS.org
//

import { type S } from '@dxos/echo-schema';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { type EchoReactiveObject, type Space, useQuery, Filter } from '@dxos/react-client/echo';

/**
 * Retrieves objects for a given schema and filters them using a global filter.
 */
export const useTableObjects = (space?: Space, schema?: S.Schema<any>): EchoReactiveObject<any>[] => {
  const objects = useQuery<EchoReactiveObject<any>>(
    space,
    schema ? Filter.schema(schema) : () => false,
    undefined,
    // TODO(burdon): Toggle deleted.
    [schema],
  );

  return useGlobalFilteredObjects(objects);
};
