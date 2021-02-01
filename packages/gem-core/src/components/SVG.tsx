//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import React, {
  MutableRefObject,
  ReactNode,
  forwardRef,
  useEffect,
  useRef
} from 'react';

import { isNull } from '../util';
import { ForwardedRef } from 'react';

interface SVGOptions {
  children: ReactNode;
  width: number;
  height: number;
  center?: boolean;
  debug?: boolean;
}

/**
 * Root SVG element.
 */
// eslint-disable-next-line react/display-name
const SVG = ({
  children, width, height, center = true, debug = true
}: SVGOptions, svgRef: ForwardedRef<any>) => {
  const svg = svgRef as MutableRefObject<any> || useRef<any>(null);

  useEffect(() => {
    if (isNull({ width, height })) {
      return;
    }

    if (center) {
      d3.select(svg.current)
        // Shift center.
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox
        .attr('viewBox', `${-width / 2},${-height / 2},${width + 1},${height + 1}`);
    }

  }, [svg, width, height]);

  return (
    <svg ref={svg} style={{ width, height }}>
      {children}
      {debug && (
        <text x={-width / 2 + 4} y={height / 2 - 4} style={{ fontSize: 14 }}>[{width}, {height}]</text>
      )}
    </svg>
  );
};

const ForwardSVG = forwardRef<any, SVGOptions>(SVG);

export default ForwardSVG;
