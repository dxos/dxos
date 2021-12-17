//
// Copyright 2020 DXOS.org
//

import React, { MutableRefObject, ReactNode, forwardRef, useEffect, useRef, useState } from 'react';
import useResizeObserver from 'use-resize-observer';
import { Property } from 'csstype';

export interface ResizeCallbackProps {
  svg: SVGElement
  width: number
  height: number
}

export interface SvgOptions {
  children?: ReactNode | ReactNode[]
  className?: string
  width?: number
  height?: number
  center?: boolean
  onResize?: (props: ResizeCallbackProps) => void
}

/**
 * SVG Container.
 *
 * @param [children]  SVG elements.
 * @param [className] Classname (allows @emotion/css injection).
 * @param [width]     Optional width (defaults to fill width).
 * @param [height]    Optional height (defaults to fill height).
 * @param [svgRef]    Reference to SVG element.
 * @constructor
 */
export const SvgContainer = forwardRef<SVGElement, SvgOptions>(({
  children,
  className,
  width: controlledWidth,
  height: controlledHeight,
  center = true,
  onResize
}: SvgOptions, svgRef: MutableRefObject<SVGSVGElement>) => {
  const { ref: div, width: currentWidth, height: currentHeight } = useResizeObserver<HTMLDivElement>();
  const [visibility, setVisibility] = useState<Property.Visibility>('hidden');
  const ref = svgRef || useRef<SVGSVGElement>();

  const x: React.CSSProperties = null;

  useEffect(() => {
    if (width && height) {
      if (center) {
        // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox
        ref.current.setAttribute('viewBox', `${-width / 2},${-height / 2},${width},${height}`);
      }

      onResize?.({ svg: ref.current, width, height });
      setVisibility(undefined);
    }
  }, [currentWidth, currentHeight]);

  // Default 1 prevents default (300 width).
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
        className={className}
        style={{
          width,
          height,
          visibility
        }}
      >
        {children}
      </svg>
    </div>
  );
});
