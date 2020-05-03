//
// Copyright 2020 DxOS, Inc.
//

import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

/**
 * Throttle update on resize.
 *
 * @param update
 * @param size
 * @param options
 */
export const useResize = (update, size, options = {}) => {
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
