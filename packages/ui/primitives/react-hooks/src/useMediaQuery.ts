//
// Copyright 2023 DXOS.org
//

// This hook is based on Chakra UI’s `useMediaQuery`: https://github.com/chakra-ui/chakra-ui/blob/main/packages/components/media-query/src/use-media-query.ts

import { useEffect, useState } from 'react';

export type UseMediaQueryOptions = {
  fallback?: boolean | boolean[];
  ssr?: boolean;
};

// TODO(thure): This should be derived from the same source of truth as the Tailwind theme config
const breakpointMediaQueries: Record<string, string> = {
  sm: '(min-width: 640px)',
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
  '2xl': '(min-width: 1536px)',
};

/**
 * React hook that tracks state of a CSS media query
 *
 * @param query the media query to match, or a recognized breakpoint token
 * @param options the media query options { fallback, ssr }
 *
 * @see Docs https://chakra-ui.com/docs/hooks/use-media-query
 */
export const useMediaQuery = (query: string | string[], options: UseMediaQueryOptions = {}): boolean[] => {
  const { ssr = true, fallback } = options;

  const queries = (Array.isArray(query) ? query : [query]).map((query) =>
    query in breakpointMediaQueries ? breakpointMediaQueries[query] : query,
  );

  let fallbackValues = Array.isArray(fallback) ? fallback : [fallback];
  fallbackValues = fallbackValues.filter((v) => v != null) as boolean[];

  const [value, setValue] = useState(() => {
    return queries.map((query, index) => ({
      media: query,
      matches: ssr ? !!fallbackValues[index] : document.defaultView?.matchMedia(query).matches,
    }));
  });

  useEffect(() => {
    setValue(
      queries.map((query) => ({
        media: query,
        matches: document.defaultView?.matchMedia(query).matches,
      })),
    );

    const mql = queries.map((query) => document.defaultView?.matchMedia(query));

    const handler = (evt: MediaQueryListEvent) => {
      setValue((prev) => {
        return prev.slice().map((item) => {
          if (item.media === evt.media) {
            return { ...item, matches: evt.matches };
          }
          return item;
        });
      });
    };

    mql.forEach((mql) => {
      if (typeof mql?.addListener === 'function') {
        mql?.addListener(handler);
      } else {
        mql?.addEventListener('change', handler);
      }
    });

    return () => {
      mql.forEach((mql) => {
        if (typeof mql?.removeListener === 'function') {
          mql?.removeListener(handler);
        } else {
          mql?.removeEventListener('change', handler);
        }
      });
    };
  }, [document.defaultView]);

  return value.map((item) => !!item.matches);
};
