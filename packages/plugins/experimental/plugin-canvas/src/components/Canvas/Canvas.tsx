//
// Copyright 2024 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Canvas as NativeCanvas, Grid, type Rect, testId, useWheel, useProjection } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { FrameDragPreview } from './Frame';
import { getShapeBounds } from './Shape';
import { Shapes } from './Shapes';
import {
  type DragDropPayload,
  useActionHandler,
  useDragMonitor,
  useEditorContext,
  useLayout,
  useSelectionEvents,
  useShortcuts,
} from '../../hooks';
import { rectContains } from '../../layout';
import { type TestId } from '../defs';
import { eventsNone, styles } from '../styles';

/**
 * Main canvas component.
 */
export const Canvas = () => {
  return (
    <NativeCanvas {...testId<TestId>('dx-canvas')}>
      <CanvasContent />
    </NativeCanvas>
  );
};

export const CanvasContent = () => {
  const { id, monitor, overlayRef, options, showGrid, selection } = useEditorContext();
  const { root, styles: projectionStyles, scale, offset } = useProjection();
  const { container, shape: dragging } = monitor.state(({ type }) => type === 'tool').value;
  const shapesRef = useRef<HTMLDivElement>(null);

  // Drop target.
  useEffect(() => {
    if (!root) {
      return;
    }

    return dropTargetForElements({
      element: root,
      getData: () => ({ type: 'canvas' }) satisfies DragDropPayload,
      canDrop: () => true,
    });
  }, [root]);

  // Keyboard shortcuts.
  useShortcuts();

  // Actions.
  useActionHandler();

  // Pan and zoom.
  useWheel();

  // Dragging and linking.
  useDragMonitor();

  // Layout.
  const layout = useLayout();

  // Selection.
  const selectionRect = useSelectionEvents(root, ({ bounds, shift }) => {
    // NOTE: bounds will be undefined if clicking on an object.
    if (bounds === null) {
      selection.clear();
    } else if (bounds) {
      selection.setSelected(
        layout.shapes
          .filter((shape) => {
            const rect = getShapeBounds(shapesRef.current!, shape.id);
            return rect && rectContains(bounds, rect);
          })
          .map((shape) => shape.id),
        shift,
      );
    }
  });

  return (
    <>
      {/* Grid. */}
      {showGrid && <Grid id={id} size={options.gridSize} scale={scale} offset={offset} classNames={styles.gridLine} />}

      {/* Layout. */}
      <Shapes {...testId<TestId>('dx-layout', true)} ref={shapesRef} layout={layout} />

      {/* Overlays. */}
      <div {...testId<TestId>('dx-overlays')} className={mx(eventsNone)}>
        {/* Selection overlay. */}
        {selectionRect && <SelectionBox rect={selectionRect} />}

        {/* Tool dragging. */}
        {container &&
          dragging &&
          createPortal(
            <div style={projectionStyles}>
              <FrameDragPreview shape={dragging} />
            </div>,
            container,
          )}

        {/* Misc overlay. */}
        <svg
          ref={overlayRef}
          className='absolute overflow-visible pointer-events-none'
          style={projectionStyles}
          width={1}
          height={1}
        >
          <g {...testId<TestId>('dx-overlay-bullets')}></g>
        </svg>
      </div>
    </>
  );
};

const SelectionBox = ({ rect }: { rect: Rect }) => {
  return (
    <svg className='absolute overflow-visible cursor-crosshair' width={1} height={1}>
      <rect {...rect} className={styles.cursor} />
    </svg>
  );
};
