//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import { fetchManyUrls, fetchUrl, type FetchUrlOptions } from './fetch-url';

/**
 * React hook exposing memoized `fetchUrl` / `fetchMany` bound to a common
 * options object (endpoint, maxLength). Pass options once at mount time; the
 * returned callbacks are stable as long as the options object is stable.
 */
export const useUrlEnricher = (options: FetchUrlOptions = {}) => {
  const stableOptions = useMemo(
    () => ({
      endpoint: options.endpoint,
      maxLength: options.maxLength,
    }),
    [options.endpoint, options.maxLength],
  );

  const fetchOne = useCallback(
    (url: string, signal?: AbortSignal) => fetchUrl(url, { ...stableOptions, signal }),
    [stableOptions],
  );

  const fetchMany = useCallback(
    (urls: readonly string[], signal?: AbortSignal) => fetchManyUrls(urls, { ...stableOptions, signal }),
    [stableOptions],
  );

  return { fetchUrl: fetchOne, fetchMany };
};
