//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import { type QueryMetrics, queryMetrics } from '@dxos/echo-client';

/** Polled rather than subscribed: queries record on every recompute, which would re-render at that rate. */
const REFRESH_INTERVAL = 1_000;

export type UseQueryMetrics = {
  queries: QueryMetrics[];
  reset: () => void;
};

/**
 * Metrics of every ECHO query run by this page's client, grouped by query text.
 */
export const useQueryMetrics = (refreshInterval = REFRESH_INTERVAL): UseQueryMetrics => {
  const [queries, setQueries] = useState<QueryMetrics[]>(() => queryMetrics.getMetrics());
  useEffect(() => {
    const interval = setInterval(() => setQueries(queryMetrics.getMetrics()), refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  const reset = useCallback(() => {
    queryMetrics.reset();
    setQueries(queryMetrics.getMetrics());
  }, []);

  return { queries, reset };
};
