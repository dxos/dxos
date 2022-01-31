//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import type { Property } from 'csstype';
import React, { MutableRefObject, ReactNode, forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import useResizeObserver from 'use-resize-observer';

import { SvgContext } from '../context';
import { Context } from '../hooks';

export interface SvgContainerProps {
  children?: ReactNode | ReactNode[]
  className?: string
  context?: SvgContext
  width?: number
  height?: number
}

/**
 * Container for SVG element.
 * @constructor
 */
export const SvgContainer = forwardRef<SVGElement, SvgContainerProps>(({
  children,
  className,
  context: controlledContext,
  width: controlledWidth,
  height: controlledHeight
}: SvgContainerProps, initialRef: MutableRefObject<SVGSVGElement>) => {
  const context = useMemo<SvgContext>(() => controlledContext || new SvgContext(), [controlledContext]);
  const svgRef = initialRef || useRef<SVGSVGElement>();
  const [visibility, setVisibility] = useState<Property.Visibility>('hidden');
  const { ref: div, width: currentWidth, height: currentHeight } = useResizeObserver<HTMLDivElement>();

  const width = controlledWidth || currentWidth;
  const height = controlledHeight || currentHeight;

  useEffect(() => {
    context.initialize(svgRef.current);
  }, []);

  useEffect(() => {
    if (width && height) {
      context.setSize({ width, height });
      d3.select(svgRef.current)
        .attr('viewBox', context.viewBox);

      setVisibility(undefined);
    }
  }, [width, height]);

  return (
    <div
      ref={div}
      style={{
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        width: controlledWidth,
        height: controlledHeight
      }}
    >
      <svg
        xmlns='http://www.w3.org/2000/svg'
        ref={svgRef}
        className={className}
        style={{
          width,
          height,
          visibility // Prevents objects jumping after viewbox set.
        }}
      >
        <Context.Provider value={context}>
          {children}
        </Context.Provider>
      </svg>
    </div>
  );
});
