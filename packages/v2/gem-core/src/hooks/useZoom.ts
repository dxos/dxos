//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import type { ZoomTransform } from 'd3';
import { RefObject, useEffect, useRef } from 'react';

import { SvgContext } from '../context';

export type ZoomExtent = [min: number, max: number];

export type ZoomOptions = {
  extent: ZoomExtent
}

const defaultOptions: ZoomOptions = {
  extent: [1/2, 2]
};

/**
 * Creates a reference to a SVG Group element which can be zoomed.
 * @param context
 * @param options
 */
export const useZoom = (context: SvgContext, options: ZoomOptions = defaultOptions): RefObject<SVGGElement> => {
  const ref = useRef<SVGGElement>();

  useEffect(() => {
    if (!options.extent) {
      return;
    }

    const init = () => {
      context.setTransform(d3.zoomIdentity);

      // d3.zoom must be called on the root svg element.
      // https://github.com/d3/d3-zoom
      d3.select(context.svg)
        .call(d3.zoom()
          // .filter(() => false)
          .scaleExtent(options.extent)
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
    };

    // May be rendered before context is initialized (since downstream of container).
    if (context.svg) {
      init();
    } else {
      return context.initialized.on(init);
    }
  }, []);

  return ref;
};
