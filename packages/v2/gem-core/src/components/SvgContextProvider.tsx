//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { ReactNode, useEffect, useMemo } from 'react';
import useResizeObserver from 'use-resize-observer';

import { SvgContext } from '../context';
import { SvgContextDef } from '../hooks';

export interface SVGCOntextProviderProps {
  context?: SvgContext
  children?: ReactNode
}

/**
 * Makes the SVG context available to child nodes.
 * Automatically resizes the SVG element, which expands to fit the container.
 * @param context
 * @param children
 * @constructor
 */
export const SvgContextProvider = ({ context: provided, children }: SVGCOntextProviderProps) => {
  const { ref, width, height } = useResizeObserver<HTMLDivElement>();
  const context = useMemo<SvgContext>(() => provided || new SvgContext(), []);

  useEffect(() => {
    if (width && height) {
      context.setSize({ width, height });
      d3.select(context.svg)
        .attr('visibility', 'visible')
        .attr('viewBox', context.viewBox)
        .attr('width', width)
        .attr('height', height);
    } else {
      d3.select(context.svg)
        .attr('visibility', 'hidden'); // Hide until first resized.
    }
  }, [width, height])

  return (
    <SvgContextDef.Provider value={context}>
      {/* Flex is imporant otherwise div has extra padding.  */}
      <div ref={ref} style={{ display: 'flex', width: '100%' }}>
        {children}
      </div>
    </SvgContextDef.Provider>
  );
};
