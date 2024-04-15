//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';
import { useMemo } from 'react';

import { useFilteredObjects } from '@braneframe/plugin-search';
import { type EchoReactiveObject, Filter } from '@dxos/echo-schema';
import { type Space, useQuery } from '@dxos/react-client/echo';

// TODO(Zan): Consolidate.
const Stable = {
  empty: {
    object: Object.freeze({}),
    array: Object.freeze([] as any[]),
  },
};

export const useObjects = (space?: Space, schema?: S.Schema<any>) => {
  const objectFilter = useMemo(() => (schema ? Filter.schema(schema) : () => false), [schema]);

  const objects = useQuery<EchoReactiveObject<any>>(
    space,
    objectFilter,
    Stable.empty.object,
    // TODO(burdon): Toggle deleted.
    [schema],
  );

  return useFilteredObjects(objects);
};
