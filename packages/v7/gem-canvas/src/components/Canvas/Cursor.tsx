//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { RefObject, useEffect, useRef } from 'react';

import { Modifiers, Point, useStateRef } from '@dxos/gem-x';

import { Tool } from '../../tools';

import {
  Control,
  createControl,
  dragBounds,
  ControlContext,
  ControlGetter,
  ControlState,
  SelectionModel
} from '../../elements';
import { ElementDataType, ElementType } from '../../model';

export interface CursorProps {
  svgRef: RefObject<SVGSVGElement>
  context: ControlContext
  elements: ControlGetter
  tool: Tool
  onSelect: (selection: SelectionModel) => void
  onCreate: (type: ElementType, data: ElementDataType) => void
}

/**
 * Cursor to create new elements.
 * @param svgRef
 * @param context
 * @param elements
 * @param tool
 * @param onSelect
 * @param onCreate
 * @constructor
 */
// TODO(burdon): Rename?
export const Cursor = ({
  svgRef,
  context,
  elements,
  tool,
  onSelect,
  onCreate
}: CursorProps) => {
  const cursorGroup = useRef<SVGSVGElement>();
  const [, setCursor, cursorRef] = useStateRef<Control<any>>();

  //
  // Deselect.
  //
  useEffect(() => {
    d3.select(svgRef.current)
      .on('click', (event) => {
        // TODO(burdon): Better way to test containing group?
        if (event.target.parentNode) {
          const control = d3.select(event.target.parentNode).datum();
          if (!control) {
            onSelect(undefined);
          }
        }
      });
  }, []);

  //
  // Create cursor.
  //
  useEffect(() => {
    const cursor = tool ? createControl(tool, context, elements) : undefined;
    cursor?.setState(ControlState.SELECTED);
    setCursor(cursor);
  }, [tool]);

  //
  // Render cursor.
  //
  // eslint-disable indent
  useEffect(() => {
    const handleUpdate = (
      p1: Point,
      p2: Point,
      mod: Modifiers,
      commit: boolean,
      source: Control<any>,
      target: Control<any>
    ) => {
      const cursor = cursorRef.current;
      const data = cursor.createFromExtent(p1, p2, mod, commit);

      // Test for source/target connection.
      if (data && cursor.type === 'line') {
        if (source) {
          data.source = {
            id: source.element.id
          };
        }
        if (target) {
          data.target = {
            id: target.element.id
          };
        }
      }

      if (commit) {
        d3.select(cursorGroup.current)
          .selectAll('g')
          .remove();

        // Undefined if the element is too small.
        if (!data) {
          return;
        }

        // Create new element.
        onCreate(cursor.type, data);
      } else {
        cursor.onUpdate(data, false);
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
      .attr('cursor', cursorRef.current ? 'crosshair' : undefined)
      .call(dragBounds(context, handleUpdate, () => onSelect(undefined))
        .container(() => svgRef.current)
        .filter(() => Boolean(cursorRef.current))); // Cancel if nothing selected to enable grid panning.
  }, [svgRef, cursorGroup]);
  // eslint-enable indent

  return (
    <g ref={cursorGroup} />
  );
};
