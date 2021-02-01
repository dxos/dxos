//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import { throttle } from 'throttle-debounce';

import { Size } from '@dxos/gem-core';

/**
 * Throttle update on resize.
 */
export const useResizeListener = (update: Function, size: Size, options: { delay?: number } = {}) => {
  const { delay = 250 } = options;
  const currentSize = useRef(size);
  const onResize = throttle(delay, false, update);

  useEffect(() => {
    if (currentSize.current.width !== size.width || currentSize.current.height !== size.height) {
      currentSize.current = size;
      onResize();
    }

    const timer = d3.timeout(() => {
    }, delay);

    return () => timer.stop();
  }, [size]);
};
