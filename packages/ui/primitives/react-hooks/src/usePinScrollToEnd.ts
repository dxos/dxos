//
// Copyright 2023 DXOS.org
//

import { type DependencyList, type MutableRefObject, useEffect, useState } from 'react';

/**
 * Glue to bottom as content is added.
 * Based on the technique described here: https://css-tricks.com/books/greatest-css-tricks/pin-scrolling-to-bottom
 */
// TODO(burdon): Causes scrollbar to be constantly visible.
export const usePinScrollToEnd = <E extends HTMLElement = HTMLElement>(
  elementRef: MutableRefObject<E | null>,
  dependencies: DependencyList,
) => {
  const [stickyScrolling, setStickyScrolling] = useState(true);
  useEffect(() => {
    const element = elementRef.current;
    if (!element) {
      return;
    }

    // TODO(burdon): Set when scrolled to bottom and unset when manually scrolled away.
    const handler = () => {
      const bottom = element.scrollHeight - element.scrollTop - element.clientHeight === 0;
      setStickyScrolling(bottom);
    };

    element.addEventListener('scroll', handler);
    return () => element.removeEventListener('scroll', handler);
  }, [elementRef.current]);

  useEffect(() => {
    if (!elementRef.current || !stickyScrolling) {
      return;
    }

    elementRef.current?.scroll({ top: elementRef.current.scrollHeight });
  }, dependencies);
};
