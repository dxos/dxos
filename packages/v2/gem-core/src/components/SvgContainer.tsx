//
// Copyright 2020 DXOS.org
//

import * as d3 from 'd3';
import type { ZoomTransform } from 'd3';
import type { Property } from 'csstype';
import React, { MutableRefObject, ReactNode, forwardRef, useEffect, useRef, useState } from 'react';
import useResizeObserver from 'use-resize-observer';
import { css } from '@emotion/css';

import { grid } from '../grid';
import { Scale } from '../util';

const defaultStyles = css`
  background-color: #FFF;

  g.grid {
    path.axis {
      stroke: #C0C0C0;
    }
    path.major {
      stroke: #E0E0E0;
    }
    path.minor {
      stroke: #F0F0F0;
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

export const defaultScale = new Scale(32);

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
  const svgRef = initialRef || useRef<SVGSVGElement>();
  const childrenRef = useRef<SVGSVGElement>();
  const gridRef = useRef<SVGSVGElement>();

  const width = controlledWidth || currentWidth;
  const height = controlledHeight || currentHeight;

  const handleResize = ({ width, height }) => {
    // Use translate on outer group to translate origin.
    // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/viewBox
    // https://www.sarasoueidan.com/blog/svg-transformations (Illustrated examples).
    // <g transform={center ? `translate(${width / 2} ${height / 2})` : undefined}>
    // TODO(burdon): Sub-pixel issue?: http://diveintohtml5.info/canvas.html
    // <g transform='translate(0.5, 0.5)'

    if (center) {
      const x = -Math.floor(width / 2);
      const y = -Math.floor(height / 2);
      d3.select(svgRef.current)
        .attr('viewBox', `${x},${y},${width},${height}`);
    }

    // Grid.
    d3.select(gridRef.current)
      .call(grid({ scale, width, height, show: showGrid }));
  }

  useEffect(() => {
    if (width && height) {
      handleResize({ width, height });

      if (zoom) {
        // Zoom must be applied to root SVG element.
        // https://github.com/d3/d3-zoom
        // https://www.d3indepth.com/zoom-and-pan
        d3.select(svgRef.current)
          .call(d3.zoom()
            // .filter(() => false)
            .extent([[0, 0], [width, height]])
            .scaleExtent(zoom)
            .on('zoom', ({ transform }: { transform: ZoomTransform }) => {
              scale.setTransform(transform);
              handleResize({ width, height });
              d3.select((zoomRoot ?? childrenRef).current)
                .attr('transform', transform as any);
            }))
          // https://github.com/d3/d3-zoom#zoom_on
          // NOTE(12/30.21): Default dblclick handler throws error.
          .on('dblclick.zoom', function (s) {
            // NOTE: Possible error if mismatched d3 versions:
            //   Uncaught TypeError: selection5.interrupt is not a function
            //   https://github.com/d3/d3-zoom/issues/167
            // zoomCallback.transform(d3.select(svgRef.current), d3.zoomIdentity);
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
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
        width: controlledWidth || '100%',
        height: controlledHeight
      }}
    >
      <svg
        ref={svgRef}
        xmlns='http://www.w3.org/2000/svg'
        className={className}
        style={{
          width,
          height,
          visibility // Prevents objects jumping after viewbox set.
        }}
      >
        <g>
          <g ref={gridRef} className='grid' />
          <g ref={childrenRef}>
            {children}
          </g>
        </g>
      </svg>
    </div>
  );
});
