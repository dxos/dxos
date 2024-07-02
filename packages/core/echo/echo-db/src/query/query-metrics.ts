//
// Copyright 2024 DXOS.org
//

import { trace } from '@dxos/tracing';

import type { Filter } from './filter';

export class QueryMetrics {
  recordNewQuery(filter: Filter) {
    trace.metrics.increment('echo.query.count', 1, {
      tags: filterTags(filter),
    });
  }

  recordQueryObjectCount(filter: Filter, count: number) {
    trace.metrics.distribution('echo.query.object-count', count, {
      tags: filterTags(filter),
    });
  }
}

const filterTags = (filter: Filter) => {
  return {
    type: filter.type?.toDXN().toString(),
  };
};
