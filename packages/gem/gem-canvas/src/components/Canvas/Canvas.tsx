//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import * as d3 from 'd3';
import React, { useEffect, useMemo, useRef } from 'react';

import { defaultGridStyles, useDynamicRef, useGrid, useSvgContext, useZoom } from '@dxos/gem-core';

import {
  ControlContext,
  ControlManager,
  ControlState,
  SelectionModel,
  canvasStyles,
  debugStyles,
  createMarkers,
  renderControls
} from '../../controls';
import { ElementData, ElementDataType, ElementId, ElementType } from '../../model';
import { Tool } from '../../tools';
import { Cursor } from './Cursor';

export interface CanvasProps {
  grid?: boolean
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
 * @param grid
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
  grid: showGrid,
  tool,
  elements = [],
  selection,
  onSelect,
  onCreate,
  onUpdate,
  onDelete,
  options
}: CanvasProps) => {
  const svgContext = useSvgContext();
  const grid = useGrid();
  const zoom = useZoom();

  // Live context
  const toolRef = useDynamicRef<Tool>(() => tool, [tool]);
  const debugRef = useDynamicRef<boolean>(() => options?.debug, [options?.debug]);
  const context = useMemo<ControlContext>(() => ({
    scale: () => svgContext.scale,
    debug: () => debugRef.current,
    draggable: () => toolRef.current === undefined
  }), []);

  useEffect(() => {
    grid.setVisible(showGrid);
  }, [showGrid]);

  // Cursor.
  useEffect(() => {
    zoom.setEnabled(!tool);
    d3.select(svgContext.svg).style('cursor', tool ? 'crosshair' : undefined);
  }, [tool]);

  // TODO(burdon): Multi-select.
  const handleSelect = (element: ElementData<any>, edit?: boolean) => {
    onSelect?.({ element, state: edit ? ControlState.EDITING : ControlState.SELECTED });
  };

  //
  // Deselect.
  //
  useEffect(() => {
    d3.select(svgContext.svg)
      .on('click', (event) => {
        // TODO(burdon): Better way to test containing group?
        if (event.target.parentNode) {
          const control = d3.select(event.target.parentNode).datum();
          if (!control) {
            onSelect?.(undefined);
          }
        }
      });
  }, [svgContext.svg]);

  //
  // Controls.
  //
  const controlsGroup = useRef<SVGSVGElement>();
  const controlManager = useMemo(() => {
    // TODO(burdon): Handle repaint via events.
    const handleRender = () => renderControls(controlsGroup.current, controlManager);
    return new ControlManager(context, handleRender, handleSelect, onUpdate);
  }, []);

  useEffect(() => {
    controlManager.updateElements(elements, selection);
  }, [elements, selection]);

  //
  // Render elements.
  //
  useEffect(() => {
    renderControls(controlsGroup.current, controlManager, debugRef.current);
  }, [controlsGroup, elements, selection]);

  useEffect(() => {
    renderControls(controlsGroup.current, controlManager, true);
  }, [debugRef.current]);

  //
  // Markers.
  //
  const markersGroup = useRef<SVGSVGElement>();
  useEffect(() => {
    d3.select(markersGroup.current).call(createMarkers());
  }, [markersGroup]);

  return (
    <svg ref={svgContext.ref}>
      <g className={clsx(canvasStyles, debugRef.current && debugStyles)}>
        <g ref={markersGroup} />
        <g ref={grid.ref} className={defaultGridStyles} />
        <g ref={zoom.ref}>
          <g ref={controlsGroup} />

          {onCreate && (
            <Cursor
              context={context}
              elements={controlManager}
              tool={tool}
              onSelect={onSelect}
              onCreate={onCreate}
            />
          )}
        </g>
      </g>
    </svg>
  );
};
