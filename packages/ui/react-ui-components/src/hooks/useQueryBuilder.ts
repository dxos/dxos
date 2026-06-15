//
// Copyright 2025 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { Filter } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
/**
 * Creates a filter from a query string.
 */
export const useQueryBuilder = (query?: string): Filter.Any => {
  const builder = useMemo(() => new QueryBuilder(), []);
  const [filter, setFilter] = useState<Filter.Any>(Filter.everything());
  useEffect(() => {
    if (query) {
      const { filter } = builder.build(query);
      setFilter(filter ?? Filter.everything());
    } else {
      setFilter(Filter.everything());
    }
  }, [builder, query]);

  return filter;
};
