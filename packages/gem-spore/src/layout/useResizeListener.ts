//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

/**
 * Throttle update on resize.
 */
export const useResizeListener = (update, size, options: { delay?: number } = {}) => {
  const { delay = 250 } = options;
  const currentSize = useRef(size);

  useEffect(() => {
    const timer = d3.timeout(() => {
      if (currentSize.current.width !== size.width || currentSize.current.height !== size.height) {
        currentSize.current = size;
        update();
      }
    }, delay);

    return () => timer.stop();
  }, [size]);
};
