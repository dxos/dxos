//
// Copyright 2020 DxOS.org
//

import * as d3 from 'd3';
import React, { forwardRef, useEffect, useRef } from 'react';

import { isNull } from '../util';

/**
 * Root SVG element.
 *
 * @param width
 * @param height
 * @param center
 * @param children
 */
// TODO(burdon): Rename.
// eslint-disable-next-line react/display-name
const SVG = forwardRef(({ children, width, height, center=true }, ref) => {
  if (!ref) {
    ref = useRef();
  }

  useEffect(() => {
    if (isNull({ width, height })) {
      return;
    }

    if (center) {
      d3.select(ref.current)
        // Move center.
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox
        .attr('viewBox', `${-width / 2},${-height / 2},${width + 1},${height + 1}`);
    }

  }, [ref, width, height]);

  return (
    <svg ref={ref} style={{ width, height }}>
      {children}
    </svg>
  );
});

export default SVG;
