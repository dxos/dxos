//
// Copyright 2022 DXOS.org
//

import { select } from 'd3';
import React, { type PropsWithChildren, useEffect, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { SVGContext, SVGContextProvider } from '../hooks';

export type SVGRootProps = PropsWithChildren<{ context?: SVGContext }>;

/**
 * Makes the SVG context available to child nodes.
 * Automatically resizes the SVG element, which expands to fit the container.
 */
// TODO(burdon): Create radix-style components.
export const SVGRoot = ({ context: provided, children }: SVGRootProps) => {
  const { ref, width = 0, height = 0 } = useResizeDetector({ refreshRate: 200 });

  // TODO(burdon): Move size to state and pass into context.
  const context = useMemo<SVGContext>(() => provided || new SVGContext(), []);

  useEffect(() => {
    if (width && height) {
      context.setSize({ width, height });

      select(context.svg)
        .attr('display', 'block')
        .attr('viewBox', context.viewBox)
        .attr('width', width)
        .attr('height', height);
    } else {
      select(context.svg).attr('display', 'none'); // Hide until mounted.
    }
  }, [context, width, height]);

  return (
    <SVGContextProvider value={context}>
      {/* Flex is important otherwise div has extra padding. */}
      <div ref={ref} className='flex w-full h-full overflow-hidden'>
        {width !== 0 && height !== 0 && children}
      </div>
    </SVGContextProvider>
  );
};
