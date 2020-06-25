//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, { forwardRef, useEffect, useRef } from 'react';

import { isNull } from '../util';

/**
 * Root SVG element.
 *
 * @param props
 * @param props.width
 * @param props.height
 * @param props.center
 * @param props.children
 * @param {Object|undefined} svgRef
 */
// eslint-disable-next-line react/display-name
const SVG = forwardRef(({ children, width, height, center=true }, svg) => {
  svg = svg || useRef();

  useEffect(() => {
    if (isNull({ width, height })) {
      return;
    }

    if (center) {
      d3.select(svg.current)
        // Move center.
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox
        .attr('viewBox', `${-width / 2},${-height / 2},${width + 1},${height + 1}`);
    }

  }, [svg, width, height]);

  return (
    <svg ref={svg} style={{ width, height }}>
      {children}
    </svg>
  );
});

export default SVG;
