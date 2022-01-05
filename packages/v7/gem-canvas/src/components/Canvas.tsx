//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

import { Bounds, Scale } from '@dxos/gem-x';

import { Cursor, Element } from '../model';
import { createSvgCursor, createSvgElement } from '../canvas';

export interface CanvasProps {
  className?: string
  scale: Scale,
  cursor?: Cursor
  elements?: Element[]
  onUpdateCursor?: (bounds: Bounds, end: boolean) => void
}

/**
 * Container for vector editing.
 * Renders d3 Elements and an active cursor inside an SVG element.
 * Elements are manipulated have mouse and key handlers.
 *
 * @constructor
 */
export const Canvas = ({
  className,
  scale,
  cursor,
  elements = [],
  onUpdateCursor
}: CanvasProps) => {
  const elementsRef = useRef<SVGSVGElement>();
  const cursorRef = useRef<SVGSVGElement>();

  //
  // Elements
  //
  useEffect(() => {
    // Hide currently selected element.
    const visible = elements.filter(element => element.id !== cursor?.element.id);

    d3.select(elementsRef.current)
      .selectAll('g')
      .data(visible, (element: Element) => element.id)
      .join('g')
      .each((element, i, nodes) => {
        createSvgElement(d3.select(nodes[i]), element, scale);
      });
  }, [elementsRef, elements, cursor])

  //
  // Cursor
  //
  useEffect(() => {
    d3.select(cursorRef.current)
      .selectAll('g')
      .data([cursor].filter(Boolean))
      .join('g')
      .each((cursor, i, nodes) => {
        createSvgCursor(d3.select(nodes[i]), cursor, scale, (bounds: Bounds, end: boolean) => {
          onUpdateCursor?.(bounds, end);
        });
      });
  }, [cursorRef, cursor]);

  return (
    <g className={className}>
      <g ref={elementsRef} />
      <g ref={cursorRef} />
    </g>
  );
};
