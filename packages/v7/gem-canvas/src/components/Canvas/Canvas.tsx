//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';

import { Modifiers, Scale, defaultScale, useStateRef, Point } from '@dxos/gem-x';

import { BaseElement, ElementCache, createElement, dragBounds } from '../../elements';
import { Element, ElementDataType, ElementId, ElementType } from '../../model';
import { Tool } from '../../tools';

// TODO(burdon): Create theme.
const styles = css`
  g.element, g.cursor {
    circle, ellipse, line, path, rect {
      stroke: #666;
      stroke-width: 2;
      fill: #F5F5F5;
      opacity: 0.7;
    }
  
    // TODO(burdon): Create separate group for frames/handles.
  
    rect.frame {
      stroke: cornflowerblue;
      stroke-width: 1;
      fill: none;    
    }
    
    circle.frame-handle {
      stroke: cornflowerblue;
      stroke-width: 1;
      fill: #EEE;
    }
  
    circle.connection-handle {
      stroke: none;
      fill: cornflowerblue;
    }
  
    rect.line-touch {
      stroke: none;
      fill: transparent;
    }
  }
`;

interface CanvasProps {
  svgRef: RefObject<SVGSVGElement>
  scale?: Scale
  tool: Tool
  elements?: Element<any>[]
  selected?: Element<any>
  onSelect?: (element: Element<any>) => void
  onUpdate?: (element: Element<any>, boolean?: boolean) => void
  onCreate?: (type: ElementType, data: ElementDataType) => void
  onDelete?: (id: ElementId) => void
}

/**
 * Editable canvas.
 * @param svgRef
 * @param scale
 * @param tool
 * @param elements
 * @param selected
 * @param onSelect
 * @param onCreate
 * @param onUpdate
 * @param onDelete
 * @constructor
 */
export const Canvas = ({
  svgRef,
  scale = defaultScale,
  tool,
  elements = [],
  selected,
  onSelect,
  onUpdate,
  onCreate,
  onDelete
}: CanvasProps) => {
  const [repaint, setRepaint] = useState(Date.now());
  const handleRepaint = () => setRepaint(Date.now());

  // Rendered elements.
  const elementGroup = useRef<SVGSVGElement>();
  const elementCache = useMemo(() => new ElementCache(scale, handleRepaint, onSelect, onUpdate), [scale]);

  // New element cursor.
  const cursorGroup = useRef<SVGSVGElement>();
  const [cursor, setCursor, cursorRef] = useStateRef<BaseElement<any>>();

  //
  // Update cache.
  //
  useEffect(() => {
    elementCache.updateElements(elements, selected);
  }, [elements, selected]);

  //
  // Deselect.
  // TODO(burdon): Deselect on drag/update other object.
  //
  useEffect(() => {
    d3.select(svgRef.current)
      .on('click', (event) => {
        const base = d3.select(event.target.parentNode).datum();
        if (!base) {
          onSelect(undefined);
        }
      });
  }, []);

  //
  // Create cursor.
  //
  useEffect(() => {
    const cursor = tool ? createElement(scale, tool) : undefined;
    cursor?.setSelected(true);
    setCursor(cursor); // TODO(burdon): ???
  }, [tool]);

  //
  // Render cursor.
  //
  // eslint-disable indent
  useEffect(() => {
    const handleUpdate = (p1: Point, p2: Point, mod: Modifiers, commit: boolean) => {
      const cursor = cursorRef.current;
      const data = cursor.createFromExtent(p1, p2, mod, commit);

      if (commit) {
        d3.select(cursorGroup.current)
          .selectAll('g')
          .remove();

        // Too small.
        if (!data) {
          onSelect(undefined);
          return;
        }

        onCreate(cursor.type, data);
      } else {
        cursor.onUpdate(data);
        d3.select(cursorGroup.current)
          .selectAll('g')
          .data([cursor])
          .join('g')
          // Allow mouse events (e.g., mouseover) to flow-through to elements below (e.g., hover).
          // https://developer.mozilla.org/en-US/docs/Web/CSS/pointer-events
          .style('pointer-events', 'none')
          .each((element, i, nodes) => {
            d3.select(nodes[i]).call(element.draw());
          });
      }
    };

    // Drag to create new element.
    // This must only be called once to not conflict with the SVGContainer zoom dragger.
    d3.select(svgRef.current)
      .attr('cursor', 'crosshair')
      .call(dragBounds(scale, handleUpdate, () => onSelect(undefined))
        .container(() => svgRef.current)
        .filter(() => Boolean(cursorRef.current))); // Cancel if nothing selected to enable grid panning.
  }, [svgRef, cursorGroup]);
  // eslint-enable indent

  //
  // Render elements.
  //
  // eslint-disable indent
  useEffect(() => {
    d3.select(elementGroup.current)
      .selectAll('g.element')
      .data(elementCache.elements, ({ element }: BaseElement<any>) => element.id)
      .join('g')
      .classed('element', true)
      .each((element, i, nodes) => {
        // Only draw if updated.
        if (element.modified) {
          d3.select(nodes[i]).call(element.draw());
        }

        // Temporarily move to the front.
        if (element.selected) {
          d3.select(nodes[i]).raise();
        }
      });
  }, [elementGroup, elements, selected, repaint]);
  // eslint-enable indent

  return (
    <g className={styles}>
      <g ref={elementGroup} />
      <g ref={cursorGroup} className='cursor' />
    </g>
  );
};
