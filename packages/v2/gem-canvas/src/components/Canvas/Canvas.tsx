//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import * as d3 from 'd3';
import React, { RefObject, useEffect, useMemo, useRef } from 'react';

import { defaultScale, Scale, useDynamicRef } from '@dxos/gem-core';

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
  // Live context
  const toolRef = useDynamicRef<Tool>(() => tool, [tool]);
  const debugRef = useDynamicRef<boolean>(() => options?.debug, [options?.debug]);
  const context = useMemo<ControlContext>(() => ({
    scale: () => scale,
    debug: () => debugRef.current,
    draggable: () => toolRef.current === undefined
  }), [scale]);

  // Cursor.
  useEffect(() => {
    d3.select(svgRef.current).style('cursor', tool ? 'crosshair' : undefined);
  }, [tool]);

  // TODO(burdon): Multi-select.
  const handleSelect = (element: ElementData<any>, edit?: boolean) => {
    onSelect({ element, state: edit ? ControlState.EDITING : ControlState.SELECTED });
  }

  //
  // Controls.
  //
  const controlsGroup = useRef<SVGSVGElement>();
  const controlManager = useMemo(() => {
    // TODO(burdon): Handle repaint via events.
    return new ControlManager(
      context, () => renderControls(controlsGroup.current, controlManager), handleSelect, onUpdate);
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
    <g className={clsx(canvasStyles, debugRef.current && debugStyles)}>
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
