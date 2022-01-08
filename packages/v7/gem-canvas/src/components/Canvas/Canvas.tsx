//
// Copyright 2022 DXOS.org
//

import * as d3 from 'd3';
import React, { RefObject, useEffect, useMemo, useRef, useState } from 'react';
import { css } from '@emotion/css';

import { Bounds, defaultScale, Scale } from '@dxos/gem-x';

import { BaseElement, ElementCache, EventMod, createElement, dragBounds } from '../../elements';
import { Element, ElementDataType, ElementId, ElementType } from '../../model';
import { Tool } from '../../tools';

// TODO(burdon): Create theme.
const styles = css`
  ellipse {
    stroke: seagreen;
    stroke-width: 2;
    fill: #F5F5F5;
  }

  rect.frame {
    stroke: #999;
    stroke-width: 1;
    stroke-dasharray: 4;
    fill: none;    
  }
  
  circle.frame-handle {
    stroke: #999;
    stroke-width: 1;
    fill: #FFF;
  }
`;

interface CanvasProps {
  svgRef: RefObject<SVGSVGElement>
  scale?: Scale
  tool: Tool
  elements?: Element<any>[]
  selected?: Element<any>
  onSelect?: (element: Element<any>) => void
  onUpdate?: (element: Element<any>) => void
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
  // Rendered elements.
  const elementGroup = useRef<SVGSVGElement>();
  const elementCache = useMemo(() => new ElementCache(scale, onSelect, onUpdate), [scale]);

  // New element cursor.
  const cursorGroup = useRef<SVGSVGElement>();
  const [cursor, setCursor] = useState<BaseElement<any>>();

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
    setCursor(cursor);
  }, [tool]);

  //
  // Render cursor.
  //
  // eslint-disable indent
  useEffect(() => {
    const handleUpdate = (bounds: Bounds, mod: EventMod, commit: boolean) => {
      const data = cursor.createData(bounds, mod, commit);

      if (commit) {
        onCreate(cursor.type, data);
        d3.select(cursorGroup.current)
          .selectAll('g')
          .remove();
      } else {
        cursor.onUpdate(data);
        d3.select(cursorGroup.current)
          .selectAll('g')
          .data([cursor])
          .join('g')
          .each((element, i, nodes) => {
            d3.select(nodes[i]).call(element.draw());
          });
      }
    };

    // Drag handler.
    d3.select(svgRef.current)
      .call(dragBounds(scale, handleUpdate, () => onSelect(undefined))
        .filter(() => Boolean(cursor)));
  }, [svgRef, cursorGroup, cursor]);
  // eslint-enable indent

  //
  // Render elements.
  //
  // eslint-disable indent
  useEffect(() => {
    d3.select(elementGroup.current)
      .selectAll('g')
      .data(elementCache.elements, ({ element }: BaseElement<any>) => element.id)
      .join('g')
      .each((element, i, nodes) => {
        d3.select(nodes[i]).call(element.draw());
      });
  }, [elementGroup, elements, selected]);
  // eslint-enable indent

  return (
    <g className={styles}>
      <g ref={elementGroup} />
      <g ref={cursorGroup} />
    </g>
  );
};
