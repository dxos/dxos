//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { RefObject, useEffect, useRef } from 'react';

import { Modifiers, Point, Scale, useStateRef } from '@dxos/gem-x';

import { Tool } from '../../tools';

import {
  Control,
  createControl,
  dragBounds,
  ElementGetter,
  ElementState,
  SelectionModel,
} from '../../elements';
import { ElementDataType, ElementType } from '../../model';

export interface CursorProps {
  svgRef: RefObject<SVGSVGElement>
  scale: Scale
  elements: ElementGetter
  tool: Tool
  onSelect: (selection: SelectionModel) => void
  onCreate: (type: ElementType, data: ElementDataType) => void
}

/**
 * Cursor to create new elements.
 * @param svgRef
 * @param scale
 * @param elements
 * @param tool
 * @param onSelect
 * @param onCreate
 * @constructor
 */
// TODO(burdon): Rename?
export const Cursor = ({
  svgRef,
  scale,
  elements,
  tool,
  onSelect,
  onCreate
}: CursorProps) => {
  const cursorGroup = useRef<SVGSVGElement>();
  const [, setCursor, cursorRef] = useStateRef<Control<any>>();

  //
  // Create cursor.
  //
  useEffect(() => {
    const cursor = tool ? createControl(tool, elements, scale) : undefined;
    cursor?.setState(ElementState.SELECTED);
    setCursor(cursor);
  }, [tool]);

  //
  // Render cursor.
  //
  // eslint-disable indent
  useEffect(() => {
    // TODO(burdon): Get source and target.
    const handleUpdate = (p1: Point, p2: Point, mod: Modifiers, commit: boolean) => {
      const cursor = cursorRef.current;

      // TODO(burdon): If creating a line, reuse drop logic (e.g., to connect).
      const data = cursor.createFromExtent(p1, p2, mod, commit);

      if (commit) {
        d3.select(cursorGroup.current)
          .selectAll('g')
          .remove();

        // Undefined if the element is too small.
        if (!data) {
          onSelect(undefined);
          return;
        }

        // Create new element.
        onCreate(cursor.type, data);
      } else {
        cursor.onUpdate(data);
        d3.select(cursorGroup.current)
          .selectAll('g')
          .data([cursor])
          .join('g')
          .attr('class', 'cursor')
          // Allow mouse events to flow-through to elements below (e.g., hover).
          .style('pointer-events', 'none')
          .each((element, i, nodes) => {
            d3.select(nodes[i]).call(element.draw());
          });
      }
    };

    // TODO(burdon): Prevent control dragging while tool selected.
    // Drag to create new element.
    // This must only be called once to not conflict with the SVGContainer zoom dragger.
    d3.select(svgRef.current)
      .attr('cursor', 'crosshair')
      .call(dragBounds(scale, handleUpdate, () => onSelect(undefined))
        .container(() => svgRef.current)
        .filter(() => Boolean(cursorRef.current))); // Cancel if nothing selected to enable grid panning.
  }, [svgRef, cursorGroup]);
  // eslint-enable indent

  return (
    <g ref={cursorGroup} />
  );
};
