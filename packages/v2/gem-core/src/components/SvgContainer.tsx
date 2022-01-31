//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import type { Property } from 'csstype';
import React, { MutableRefObject, ReactNode, forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import useResizeObserver from 'use-resize-observer';

import { SvgContext } from '../context';

export interface SvgContainerProps {
  children?: ReactNode | ReactNode[]
  className?: string
  width?: number
  height?: number
  context?: SvgContext
}

/**
 * Wraps SVG element and handles resizing and grid.
 * @constructor
 */
export const SvgContainer = forwardRef<SVGElement, SvgContainerProps>(({
  children,
  className,
  width: controlledWidth,
  height: controlledHeight,
  context: controlledContext,
}: SvgContainerProps, initialRef: MutableRefObject<SVGSVGElement>) => {
  const context = useMemo(() => controlledContext || new SvgContext(), [controlledContext]);
  const svgRef = initialRef || useRef<SVGSVGElement>();
  const [visibility, setVisibility] = useState<Property.Visibility>('hidden');
  const { ref: div, width: currentWidth, height: currentHeight } = useResizeObserver<HTMLDivElement>();

  const width = controlledWidth || currentWidth;
  const height = controlledHeight || currentHeight;

  useEffect(() => {
    context.setSvg(svgRef.current);
  }, [svgRef]);

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
        width: controlledWidth, // TODO(burdon): Document geometry.
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
        {children}
      </svg>
    </div>
  );
});
