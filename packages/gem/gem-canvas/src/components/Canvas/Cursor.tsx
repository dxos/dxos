//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import * as d3 from 'd3';
import React, { useEffect, useRef } from 'react';

import { Modifiers, Point, useStateRef, useSvgContext } from '@dxos/gem-core';

import {
  Connection,
  Control,
  ControlContext,
  ControlGetter,
  ControlState,
  SelectionModel,
  createControl,
  dragBounds,
  elementStyles
} from '../../controls';
import { ElementDataType, ElementType } from '../../model';
import { Tool } from '../../tools';

export interface CursorProps {
  context: ControlContext
  elements: ControlGetter
  tool: Tool
  onSelect: (selection: SelectionModel) => void
  onCreate: (type: ElementType, data: ElementDataType) => void
}

/**
 * Cursor to create new elements.
 * @param context
 * @param elements
 * @param tool
 * @param onSelect
 * @param onCreate
 * @constructor
 */
export const Cursor = ({
  context,
  elements,
  tool,
  onSelect,
  onCreate
}: CursorProps) => {
  const svgContext = useSvgContext();
  const cursorGroup = useRef<SVGSVGElement>();
  const [, setCursor, cursorRef] = useStateRef<Control<any>>();

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
      source?: Connection,
      target?: Connection
    ) => {
      const cursor = cursorRef.current;
      const data = cursor.createFromExtent(p1, p2, mod, commit);

      if (commit) {
        // Remove cursor.
        d3.select(cursorGroup.current)
          .selectAll('g')
          .remove();

        if (!cursor.checkBounds(data)) {
          return;
        }

        // Test for source/target connection.
        if (data && cursor.type === 'line') {
          if (source?.id) {
            data.source = source;
          }
          if (target?.id) {
            data.target = target;
          }
        }

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
          .attr('class', clsx('cursor', elementStyles.default))
        // Allow mouse events to flow-through to elements below (e.g., hover).
          .style('pointer-events', 'none')
          .each((element, i, nodes) => {
            d3.select(nodes[i]).call(element.draw());
          });
      }
    };

    // Drag to create new element.
    // This must only be called once to not conflict with the SVGContainer zoom dragger.
    d3.select(svgContext.svg)
      .style('cursor', cursorRef.current ? 'crosshair' : undefined)
      .call(dragBounds(context, handleUpdate, () => onSelect?.(undefined))
        .container(() => svgContext.svg)
        .filter(() => Boolean(cursorRef.current))); // Cancel if nothing selected to enable grid panning.

  }, [svgContext.svg, cursorGroup]);
  // eslint-enable indent

  return (
    <g ref={cursorGroup} />
  );
};
