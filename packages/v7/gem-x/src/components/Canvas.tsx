//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

import { Element } from '../model';
import { Scale } from '../scale';
import {
  createSvgCursor,
  createSvgElement,
  updateSvgCursor,
  updateSvgElement
} from '../canvas';

export interface CanvasProps {
  scale: Scale,
  cursor?: Element
  elements?: Element[]
  className?: string
}

export const Canvas = ({
  scale,
  cursor,
  elements,
  className,
}: CanvasProps) => {
  const elementsRef = useRef<SVGSVGElement>();
  const cursorRef = useRef<SVGSVGElement>();

  // Data joins:
  // https://github.com/d3/d3-selection#selection_data
  // https://github.com/d3/d3-selection#selection_join

  useEffect(() => {
    d3.select(elementsRef.current)
      .selectAll('g')
      .data(elements, (element: Element) => element.id)
      .join(
        enter => {
          const root = enter.append('g');
          root.each((data, i, el) => createSvgElement(d3.select(el[i]), data, scale));
          return root;
        },
        update => {
          update.each((data, i, el) => updateSvgElement(d3.select(el[i]), data, scale));
          return update;
        },
        exit => {
          exit.remove();
        }
      );
  }, [elementsRef, elements])

  useEffect(() => {
    d3.select(cursorRef.current)
      .selectAll('g')
      .data(cursor ? [cursor] : [], (element: Element) => element.id)
      .join(
        enter => {
          const root = enter.append('g');
          root.each((data, i, el) => createSvgCursor(d3.select(el[i]), data, scale));
          return root;
        },
        update => {
          update.each((data, i, el) => updateSvgCursor(d3.select(el[i]), data, scale));
          return update;
        },
        exit => {
          exit.remove();
        }
      );
  }, [cursorRef, cursor]);

  return (
    <g className={className}>
      <g ref={elementsRef} />
      <g ref={cursorRef} />
    </g>
  );
};
