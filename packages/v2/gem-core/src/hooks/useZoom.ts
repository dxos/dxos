//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import type { ZoomTransform } from 'd3';
import { useEffect, useRef } from 'react';

import { SvgContext } from '../context';

export type ZoomExtent = [min: number, max: number];

/**
 *
 * @param context
 * @param extent
 */
export const useZoom = (
  context: SvgContext,
  extent: ZoomExtent = [1, 2]
) => {
  const ref = useRef();

  useEffect(() => {
    context.setTransform(d3.zoomIdentity);
  }, []);

  useEffect(() => {
    // d3.zoom must be called on the root svg element.
    // https://github.com/d3/d3-zoom
    d3.select(context.svg)
      .call(d3.zoom()
        // .filter(() => false)
        .scaleExtent(extent)
        .on('zoom', ({ transform }: { transform: ZoomTransform }) => {
          context.setTransform(transform);
          d3.select((ref).current)
            .attr('transform', transform as any);
        }))

      // https://github.com/d3/d3-zoom#zoom_on
      // NOTE(12/30.21): Default dblclick handler throws error.
      .on('dblclick.zoom', function () {
        // https://github.com/d3/d3-zoom/issues/167
        // NOTE: Possible error if mismatched d3 versions:
        // - Uncaught TypeError: selection5.interrupt is not a function
        // zoomCallback.transform(d3.select(svgRef.current), d3.zoomIdentity);
      }
    );
  }, [context.size]);

  return ref;
};
