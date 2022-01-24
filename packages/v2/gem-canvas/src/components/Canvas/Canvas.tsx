//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import debug from 'debug';
import * as d3 from 'd3';
import React, { RefObject, useEffect, useMemo, useRef, useState } from 'react';

import { defaultScale, Scale, useStateRef } from '@dxos/gem-core';

const log = debug('gem:canvas:debug');

import {
  Control,
  ControlContext,
  ControlManager,
  ControlState,
  SelectionModel
} from '../../controls';
import { ElementData, ElementDataType, ElementId, ElementType, Line } from '../../model';
import { Tool } from '../../tools';
import { canvasStyles, debugStyles, elementStyles } from '../styles';
import { createMarkers } from '../markers';
import { Cursor } from './Cursor';

export const useRepaint = (deps?): [number, () => void] => {
  const [repaint, setRepaint] = useState(Date.now());
  useEffect(() => {
    setRepaint(Date.now());
  }, deps ?? []);

  return [repaint, () => setRepaint(Date.now())];
}

export interface CanvasProps {
  svgRef: RefObject<SVGSVGElement>
  scale?: Scale
  tool?: Tool
  elements?: ElementData<any>[]
  selection?: SelectionModel
  onSelect?: (selection: SelectionModel) => void
  onCreate?: (type: ElementType, data: ElementDataType) => void
  onUpdate?: (element: ElementData<any>, commit?: boolean) => void
  onDelete?: (id: ElementId) => void
  options?: {
    debug?: boolean
    repaint?: number // Set to Date.now() to force repaint.
  }
}

/**
 * Main canvas component.
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
  onCreate,
  onUpdate,
  onDelete,
  options
}: CanvasProps) => {
  const { debug = false } = options ?? { debug: false };

  // Refresh.
  const [repaint, handleRepaint] = useRepaint([options.repaint]);

  // Markers.
  const markersGroup = useRef<SVGSVGElement>();

  // TODO(burdon): Multi-select.
  const handleSelect = (element: ElementData<any>, edit?: boolean) => {
    onSelect({ element, state: edit ? ControlState.EDITING : ControlState.SELECTED });
  }

  // Context
  // TODO(burdon): Strange but don't want to trigger new ControlManager.
  const [, setTool, toolRef] = useStateRef(tool);
  useEffect(() => setTool(tool), [tool]);
  const context = useMemo<ControlContext>(() => ({
    scale: () => scale,
    draggable: () => {
      return toolRef.current === undefined;
    }
  }), [scale]);

  // Controls.
  const controlsGroup = useRef<SVGSVGElement>();
  const controlManager = useMemo(() => {
    // TODO(burdon): Handle repaint differently (via events).
    return new ControlManager(context, handleRepaint, handleSelect, onUpdate);
  }, []);

  //
  // Update cache.
  //
  useEffect(() => {
    controlManager.updateElements(elements, selection);
  }, [elements, selection]);

  //
  // Render elements.
  //
  useEffect(() => {
    const modified = [];
    controlManager.controls.forEach(control => {
      if (control.modified) {
        modified.push(control.element.id);
      }

      // TODO(burdon): Hack to add dependencies.
      if (control.element.type === 'line') {
        const data: Line = control.data;
        if (data.source?.id && controlManager.getControl(data.source?.id)?.modified
          || data.target?.id && controlManager.getControl(data.target?.id)?.modified) {
          modified.push(control.element.id);
        }
      }
    })

    // eslint-disable indent
    d3.select(controlsGroup.current)
      .selectAll<SVGElement, Control<any>>('g.control')
      .data(controlManager.controls, control => control.element.id)
      .join(enter => {
        log('enter', enter.size());
        return enter
          .append('g')
          .on('click', function () {
            const control = d3.select<SVGElement, Control<any>>(this).datum();
            if (!control.editing) {
              control.onSelect(true);
            }
          })
          .on('dblclick', function () {
            const control = d3.select<SVGElement, Control<any>>(this).datum();
            if (!control.editing) {
              control.onEdit(true);
            }
          })
          .on('mouseenter', function () {
            const control = d3.select<SVGElement, Control<any>>(this).datum();
            if (!control.editing && !control.selected) {
              control.onHover(true);
            }
          })
          // TODO(burdon): Doesn't leave if dragging and exit via handle.
          .on('mouseleave', function () {
            const control = d3.select<SVGElement, Control<any>>(this).datum();
            if (!control.editing && !control.selected) {
              control.onHover(false);
            }
          });
      })
      .attr('class', d => clsx('control', elementStyles['default'], elementStyles[d.data.style]))
      .each((control, i, nodes) => {
        // Draw if modified.
        if (modified.includes(control.element.id)) {
          log('update', control.element.id);
          d3.select(nodes[i]).call(control.draw());
        }

        // Temporarily move to the front.
        // TODO(burdon): Move frames, etc. to different group.
        if (control.active || control.hover) {
          d3.select(nodes[i]).raise();
        }
      });
    // eslint-enable indent
  }, [controlsGroup, elements, selection, repaint]);

  //
  // Markers.
  //
  useEffect(() => {
    d3.select(markersGroup.current).call(createMarkers());
  }, [markersGroup]);

  return (
    <g className={clsx(canvasStyles, debug && debugStyles)}>
      <g ref={markersGroup} />
      <g ref={controlsGroup} />
      <Cursor
        svgRef={svgRef}
        context={context}
        elements={controlManager}
        tool={tool}
        onSelect={onSelect}
        onCreate={onCreate}
      />
    </g>
  );
};
