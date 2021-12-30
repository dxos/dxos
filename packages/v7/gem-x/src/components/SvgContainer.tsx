//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import { ZoomTransform } from 'd3';
import { Property } from 'csstype';
import React, { MutableRefObject, ReactNode, forwardRef, useEffect, useRef, useState } from 'react';
import useResizeObserver from 'use-resize-observer';
import { css } from '@emotion/css';

import { grid } from '../grid';
import { defaultScale, Scale } from '../scale';

const defaultStyles = css`
  g.grid {
    path {
      stroke: #E5E5E5;
    }
    path.axis {
      stroke: red;
    }
  }
}`;

export interface ResizeCallbackProps {
  svg: SVGElement
  width: number
  height: number
  transform?: any
}

export type Zoom = [min: number, max: number];

export interface SvgContainerProps {
  children?: ReactNode | ReactNode[]
  className?: string
  width?: number
  height?: number
  center?: boolean
  scale?: Scale
  grid?: boolean
  zoom?: Zoom
  zoomRoot?: React.RefObject<SVGElement>
  onZoom?: (transform: any) => void
  onResize?: (props: ResizeCallbackProps) => void
}

/**
 * SVG Container.
 * @param [children]  SVG elements.
 * @param [className] Classname (allows @emotion/css injection).
 * @param [width]     Optional width (defaults to fill width).
 * @param [height]    Optional height (defaults to fill height).
 * @param [svgRef]    Reference to SVG element.
 * @constructor
 */
export const SvgContainer = forwardRef<SVGElement, SvgContainerProps>(({
  children,
  className = defaultStyles,
  width: controlledWidth,
  height: controlledHeight,
  center = true,
  scale = defaultScale,
  grid: showGrid,
  zoom,
  zoomRoot,
  onZoom,
  onResize
}: SvgContainerProps, initialRef: MutableRefObject<SVGSVGElement>) => {
  const { ref: div, width: currentWidth, height: currentHeight } = useResizeObserver<HTMLDivElement>();
  const [visibility, setVisibility] = useState<Property.Visibility>('hidden');
  const [transform, setTransform] = useState<ZoomTransform>();
  const svgRef = initialRef || useRef<SVGSVGElement>();
  const childrenRef = useRef<SVGSVGElement>();
  const gridRef = useRef<SVGSVGElement>();

  // Default value of 1 prevents default (300 width).
  const width = controlledWidth || currentWidth;
  const height = controlledHeight || currentHeight;

  const handleResize = ({ width, height }, transform) => {
    if (center) {
      // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox
      svgRef.current
        .setAttribute('viewBox', `${-width / 2},${-height / 2},${width},${height}`);
    }

    if (showGrid) {
      d3.select(gridRef.current)
        .call(grid({ scale, transform, width, height }));
    }
  }

  useEffect(() => {
    if (width && height) {
      handleResize({ width, height }, transform);

      if (zoom) {
        const zoomCallback = d3.zoom()
          .extent([[0, 0], [width, height]])
          .scaleExtent(zoom)
          .on('zoom', function ({ transform }: { transform: ZoomTransform }) {
            setTransform(transform);
            handleResize({ width, height }, transform);
            d3.select((zoomRoot ?? childrenRef).current)
              .attr('transform', transform as any);
          })

        // Zoom must be applied to SVG element.
        // https://github.com/d3/d3-zoom#zoom_on
        // https://www.d3indepth.com/zoom-and-pan
        d3.select(svgRef.current)
          .call(zoomCallback)
          // https://github.com/d3/d3-zoom#zoom_on
          // NOTE(12/30.21): Default dblclick handler throws error.
          .on('dblclick.zoom', function (s) {
            // NOTE: Possible error if mismatched d3 versions:
            //   Uncaught TypeError: selection5.interrupt is not a function
            //   https://github.com/d3/d3-zoom/issues/167
            zoomCallback.transform(d3.select(svgRef.current), d3.zoomIdentity);
          });
      }

      onResize?.({ svg: svgRef.current, width, height });
      setVisibility(undefined);
    }
  }, [Boolean(showGrid), Boolean(zoom), width, height]);

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
        ref={svgRef}
        className={className}
        style={{
          width,
          height,
          visibility // Prevents objects jumping after viewbox set.
        }}
      >
        <g ref={gridRef} className='grid' />
        <g ref={childrenRef}>
          {children}
        </g>
      </svg>
    </div>
  );
});
