//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';
import React, { RefObject, useEffect, useRef } from 'react';

import { Bounds, Point, Scale, contains } from '@dxos/gem-x';

import {
  createKeyHandlers,
  createMouseHandlers,
  createSvgCursor,
  createSvgElement, Editor,
  useCursor,
  useElements,
} from '../canvas';
import { Cursor, Element } from '../model';

export interface CanvasProps {
  className?: string
  svgRef: RefObject<SVGSVGElement>
  scale: Scale,
  editor: Editor
}

/**
 * Container for vector editing.
 * Renders d3 Elements and an active cursor inside an SVG element.
 * Elements are manipulated have mouse and key handlers.
 * @constructor
 */
export const Canvas = ({
  className,
  svgRef,
  scale,
  editor
}: CanvasProps) => {
  const elementGroup = useRef<SVGSVGElement>();
  const cursorGroup = useRef<SVGSVGElement>();

  const elements = useElements(editor);
  const cursor = useCursor(editor);

  const findElement = (point: Point) => {
    let selected: Element;
    const p = scale.translatePoint(point);
    d3.select(elementGroup.current).selectAll<any, Element>('g').each((element, i, nodes) => {
      const bounds = d3.select<any, Element>(nodes[i]).node().getBBox();
      if (contains(bounds, p)) {
        selected = element;
      }
    });

    return selected;
  };

  useEffect(() => {
    // Mouse events.
    d3.select(svgRef.current)
      .call(createMouseHandlers(editor, scale, findElement));

    // Key events.
    d3.select(document.body)
      .call(createKeyHandlers(editor));
  }, [svgRef]);

  const handleMoveElement = (element: Element, delta: Point, commit: boolean) => {
    editor.updateElement(element);
  };

  // TODO(burdon): Cursor object.
  const handleUpdateCursor = (cursor: Cursor, bounds: Bounds, commit: boolean) => {
    // TODO(burdon): Snap to fractions.
    const { x, y, width, height } = bounds; // Current.
    const pos = scale.mapToModel([x, y]);
    const size = scale.mapToModel([width, height]);

    {
      // TODO(burdon): Reuse logic in handlers (move to editor).
      let { x, y, width, height } = cursor.bounds;

      // Clamp width.
      if (size[0] >= 1) {
        x = pos[0];
        width = size[0];
      }

      // Clamp height.
      if (size[1] >= 1) {
        y = pos[1];
        height = size[1];
      }

      if (commit) {
        const [x1, y1, width1, height1] = scale.snap([x, y, width, height]);
        editor.updateElement({
          ...cursor.element,
          // TODO(burdon): Rect only.
          data: { x: x1, y: y1, width: width1, height: height1 }
        });
        editor.setCursor({
          ...cursor,
          bounds: { x: x1, y: y1, width: width1, height: height1 }
        });
      } else {
        editor.setCursor({
          ...cursor,
          bounds: { x, y, width, height }
        });
      }
    }
  };

  //
  // Elements
  //
  useEffect(() => {
    // Hide currently selected element.
    const visible = elements.filter(element => element.id !== cursor?.element?.id);
    d3.select(elementGroup.current)
      .selectAll('g')
      .data(visible, (element: Element) => element.id)
      .join('g')
      .each((element, i, nodes) => {
        createSvgElement(d3.select(nodes[i]), element, scale, handleMoveElement);
      });
  }, [elementGroup, elements, cursor])

  //
  // Cursor
  //
  useEffect(() => {
    d3.select(cursorGroup.current)
      .selectAll('g')
      .data([cursor].filter(Boolean))
      .join('g')
      .each((cursor, i, nodes) => {
        createSvgCursor(d3.select(nodes[i]), cursor, scale, handleUpdateCursor);
      });
  }, [cursorGroup, cursor]);

  return (
    <g className={className}>
      <g ref={elementGroup} />
      <g ref={cursorGroup} />
    </g>
  );
};
