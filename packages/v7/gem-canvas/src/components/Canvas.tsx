//
// Copyright 2021 DXOS.org
//

import * as d3 from 'd3';
import React, { RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { Bounds, Point, Scale, contains } from '@dxos/gem-x';

import { Editor, createKeyHandlers, createMouseHandlers, createSvgCursor, createSvgElement } from '../canvas';
import { Cursor, Element } from '../model';
import { Tool } from './Toolbar';

export interface CanvasProps {
  className?: string
  svgRef: RefObject<SVGSVGElement>
  scale: Scale,
  tool?: Tool,
  elements?: Element[]
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
  svgRef,
  scale,
  tool,
  elements: controlledElements = []
}: CanvasProps) => {
  const elementGroup = useRef<SVGSVGElement>();
  const cursorGroup = useRef<SVGSVGElement>();

  // TODO(burdon): State object is redundent with state below? Acts as ref?
  const editor = useMemo(() => new Editor(scale), [scale]);

  // TODO(burdon): Items vs elements?
  const [elements, setElements] = useState<Element[]>([]);
  const [cursor, setCursor] = useState<Cursor>();

  useEffect(() => {
    setElements(controlledElements);
  }, [controlledElements]);

  useEffect(() => {
    editor.setTool(tool);
    editor.setCursor(cursor);
    editor.setElements(elements);
  }, [tool, cursor, elements]);

  useEffect(() => {
    const handleCreate = (element: Element) => setElements(elements => [...elements, element]);
    const handleDelete = (selected: Element) => {
      const idx = editor.elements.findIndex(element => element.id === selected.id);
      if (idx !== -1) {
        editor.elements.splice(idx, 1);
        setElements(editor.elements);
        setCursor(undefined);
      }
    }

    // Key events.
    d3.select(document.body)
      .call(createKeyHandlers(editor, setCursor, handleCreate, handleDelete));

    // Mouse events.
    d3.select(svgRef.current)
      .call(createMouseHandlers(editor, setCursor, handleCreate, (point: Point) => {
        let selected: Element;

        const p = scale.translatePoint(point);
        d3.select(elementGroup.current).selectAll<any, Element>('g').each((element, i, nodes) => {
          const bounds = d3.select<any, Element>(nodes[i]).node().getBBox();
          if (contains(bounds, p)) {
            selected = element;
          }
        });

        return selected;
      }));
  }, [svgRef]);

  const handleUpdate = (bounds: Bounds, end: boolean) => {
    const [x, y, width, height] = bounds; // Current.

    // TODO(burdon): Snap to fractions.
    const pos = scale.mapToModel([x, y]);
    const size = scale.mapToModel([width, height]);

    // Update cursor and element.
    setCursor(cursor => {
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

      // Update element.
      if (end) {
        // Snap.
        const [x1, y1, width1, height1] = scale.snap([x, y, width, height]);
        setCursor({
          ...cursor,
          bounds: { x: x1, y: y1, width: width1, height: height1 }
        })

        setElements(elements => {
          const idx = elements.findIndex(element => element.id === editor.selected.id);
          if (idx !== -1) {
            const element = elements[idx];
            elements.splice(idx, 1, {
              ...element,
              data: { x: x1, y: y1, width: width1, height: height1 }
            });

            return [...elements];
          }
        });
      }

      return {
        ...cursor,
        bounds: { x, y, width, height }
      }
    });
  };

  //
  // Elements
  //
  useEffect(() => {
    // Hide currently selected element.
    const visible = elements.filter(element => element.id !== cursor?.element.id);

    d3.select(elementGroup.current)
      .selectAll('g')
      .data(visible, (element: Element) => element.id)
      .join('g')
      .each((element, i, nodes) => {
        createSvgElement(d3.select(nodes[i]), element, scale);
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
        createSvgCursor(d3.select(nodes[i]), cursor, scale, (bounds: Bounds, end: boolean) => {
          handleUpdate?.(bounds, end);
        });
      });
  }, [cursorGroup, cursor]);

  return (
    <g className={className}>
      <g ref={elementGroup} />
      <g ref={cursorGroup} />
    </g>
  );
};
