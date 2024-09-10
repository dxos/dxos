//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { type PropsWithChildren, useEffect, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { SVGContext, SVGContextProvider } from '../hooks';

export type SVGRootProps = PropsWithChildren<{ context?: SVGContext }>;

/**
 * Makes the SVG context available to child nodes.
 * Automatically resizes the SVG element, which expands to fit the container.
 */
// TODO(burdon): Create radix-style components.
// TODO(burdon): Can't pass in context. Instead imperative handle.
export const SVGRoot = ({ context: provided, children }: SVGRootProps) => {
  const { ref: resizeRef, width = 0, height = 0 } = useResizeDetector({ refreshRate: 200 });

  // TODO(burdon): Move size to state and pass into context.
  // console.log(width, height);
  const context = useMemo<SVGContext>(() => provided || new SVGContext(), [width, height]);

  useEffect(() => {
    if (width && height) {
      // TODO(burdon): Does not trigger resize.
      // context.setSize({ width, height });
      d3.select(context.svg)
        .attr('display', 'block')
        .attr('viewBox', context.viewBox)
        .attr('width', width)
        .attr('height', height);
    } else {
      d3.select(context.svg).attr('display', 'none'); // Hide until mounted.
    }
  }, [width, height]);

  return (
    <SVGContextProvider value={context}>
      {/* Flex is important otherwise div has extra padding. */}
      <div ref={resizeRef} className='flex w-full h-full overflow-hidden'>
        {width !== 0 && height !== 0 && children}
      </div>
    </SVGContextProvider>
  );
};
