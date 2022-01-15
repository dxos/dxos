//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import clsx from 'clsx';
import * as d3 from 'd3';
import React, { RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { defaultScale, Modifiers, Point, Scale, useStateRef } from '@dxos/gem-x';

import {
  Control,
  createControl,
  createMarkers,
  dragBounds,
  ElementCache,
  ElementState,
  SelectionModel,
} from '../../elements';
import { ElementData, ElementDataType, ElementId, ElementType } from '../../model';
import { Tool } from '../../tools';

// TODO(burdon): Create theme.
const styles = css`
  marker {
    path.arrow {
      stroke: blue;
      fill: none;
    }
  }

  g.element, g.cursor {
    circle, ellipse, line, path, polygon, polyline, rect {
      stroke: #666;
      stroke-width: 2;
      fill: #F5F5F5;
      opacity: 0.7;
    }
    line, polyline { 
      stroke: blue;
    }

    // TODO(burdon): Create separate group for frames/handles.
 
    input {
      border: none;
      outline: none;
    }
  
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

const debugStyles = css`
  g.element, g.cursor {
    rect.line-touch {
      fill: pink;
    }
  }
`;

export interface CanvasProps {
  svgRef: RefObject<SVGSVGElement>
  scale?: Scale
  tool: Tool
  elements?: ElementData<any>[]
  selection?: SelectionModel
  onSelect?: (selection: SelectionModel) => void
  onUpdate?: (element: ElementData<any>, commit?: boolean) => void
  onCreate?: (type: ElementType, data: ElementDataType) => void
  onDelete?: (id: ElementId) => void
  options?: {
    debug: boolean
  }
}

/**
 * Editable canvas.
 * @param svgRef
 * @param scale
 * @param tool
 * @param elements
 * @param selection
 * @param onSelect
 * @param onCreate
 * @param onUpdate
 * @param onDelete
 * @param options
 * @constructor
 */
export const Canvas = ({
  svgRef,
  scale = defaultScale,
  tool,
  elements = [],
  selection,
  onSelect,
  onUpdate,
  onCreate,
  onDelete,
  options = {
    debug: false
  }
}: CanvasProps) => {
  const { debug } = options;
  const [repaint, setRepaint] = useState(Date.now());
  const handleRepaint = () => setRepaint(Date.now());

  // TODO(burdon): Multi-select.
  const handleSelect = (element: ElementData<any>, edit?: boolean) => {
    onSelect({ element, state: edit ? ElementState.EDITING : ElementState.SELECTED });
  }

  // Markers.
  const markersGroup = useRef<SVGSVGElement>();

  // Rendered elements.
  const elementGroup = useRef<SVGSVGElement>();
  const elementCache = useMemo(() => new ElementCache(scale, handleRepaint, handleSelect, onUpdate), [scale]);

  // New element cursor.
  const cursorGroup = useRef<SVGSVGElement>();
  const [cursor, setCursor, cursorRef] = useStateRef<Control<any>>();

  //
  // Update cache.
  //
  useEffect(() => {
    elementCache.updateElements(elements, selection);
  }, [elements, selection]);

  //
  // Deselect.
  // TODO(burdon): Deselect on drag/update other object.
  //
  useEffect(() => {
    d3.select(svgRef.current)
      .on('click', (event) => {
        const control = d3.select(event.target.parentNode).datum();
        if (!control) {
          onSelect(undefined);
        }
      });
  }, []);

  //
  // Create cursor.
  //
  useEffect(() => {
    const cursor = tool ? createControl(tool, elementCache, scale) : undefined;
    cursor?.setState(ElementState.SELECTED);
    setCursor(cursor); // TODO(burdon): ???
  }, [tool]);

  //
  // Render cursor.
  //
  // TODO(burdon): Factor out.
  // eslint-disable indent
  useEffect(() => {
    const handleUpdate = (p1: Point, p2: Point, mod: Modifiers, commit: boolean) => {
      const cursor = cursorRef.current;

      // TODO(burdon): If creating a line, reuse drop logic (e.g., to connect).
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
          .attr('class', 'cursor')
          // Allow mouse events (e.g., mouseover) to flow-through to elements below (e.g., hover).
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
      .data(elementCache.elements, ({ element }: Control<any>) => element.id)
      .join(enter => {
        return enter
          .append('g')
          .attr('class', 'element')
          .on('mouseenter', function () {
            const control = d3.select(this).datum() as Control<any>;
            control.onHover(true);
          })
          .on('mouseleave', function () {
            const control = d3.select(this).datum() as Control<any>;
            control.onHover(false);
          });
      })
      .each((element, i, nodes) => {
        // TODO(burdon): Currently disabled since otherwise connected lines won't update when dragging source/target.
        // Only draw if updated.
        // if (element.modified) {
          d3.select(nodes[i]).call(element.draw());
        // }

        // Temporarily move to the front.
        if (element.active) {
          d3.select(nodes[i]).raise();
        }
      });
  }, [elementGroup, elements, selection, repaint]);
  // eslint-enable indent

  useEffect(() => {
    d3.select(markersGroup.current).call(createMarkers());
  }, [markersGroup]);

  return (
    <g className={clsx(styles, debug && debugStyles)}>
      <g ref={markersGroup} />
      <g ref={elementGroup} />
      <g ref={cursorGroup} />
    </g>
  );
};
