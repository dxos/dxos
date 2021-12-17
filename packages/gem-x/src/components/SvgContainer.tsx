//
// Copyright 2020 DXOS.org
//

import React, { MutableRefObject, ReactNode, forwardRef, useEffect, useRef } from 'react';
import useResizeObserver from 'use-resize-observer';

export interface ResizeCallbackProps {
  svg: SVGElement
  width: number
  height: number
}

export interface SvgOptions {
  children?: ReactNode | ReactNode[]
  style?: any
  width?: number
  height?: number
  onResize?: (props: ResizeCallbackProps) => void
}

/**
 * SVG Container.
 *
 * @param [children]  SVG elements.
 * @param [width]     Optional width (defaults to fill width).
 * @param [height]    Optional height (defaults to fill height).
 * @param [style]     Style properties.
 * @param [svgRef]    Reference to SVG element.
 * @constructor
 */
export const SvgContainer = forwardRef<SVGElement, SvgOptions>(({
  children,
  width: controlledWidth,
  height: controlledHeight,
  style,
  onResize
}: SvgOptions, svgRef: MutableRefObject<SVGSVGElement>) => {
  const { ref: div, width: currentWidth, height: currentHeight } = useResizeObserver<HTMLDivElement>();
  const ref = svgRef || useRef<SVGSVGElement>();

  useEffect(() => {
    if (width && height) {
      onResize?.({ svg: ref.current, width, height });
    }
  }, [currentWidth, currentHeight]);

  const width = controlledWidth || currentWidth;
  const height = controlledHeight || currentHeight;

  return (
    <div
      ref={div}
      style={{
        overflow: 'hidden',
        width: controlledWidth || '100%',
        height: controlledHeight
      }}
    >
      <svg
        ref={ref}
        style={{ width, height, ...style }}
      >
        {children}
      </svg>
    </div>
  );
});
