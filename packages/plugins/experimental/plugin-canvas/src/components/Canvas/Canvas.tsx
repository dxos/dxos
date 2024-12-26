//
// Copyright 2024 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useEffect, useRef } from 'react';

import { Canvas as NativeCanvas, Grid, type Rect, testId, useWheel, useProjection } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

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
import { PathComponent } from '../../shapes';
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
  const { id, overlaySvg, options, debug, showGrid, selection } = useEditorContext();
  const { root, styles: projectionStyles, setProjection, scale, offset } = useProjection();

  // Actions.
  useActionHandler();

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

  // Pan and zoom.
  useWheel(root, setProjection);

  // Dragging and linking.
  const { overlay } = useDragMonitor(root);

  // Layout.
  const layout = useLayout();

  // Selection.
  const shapesRef = useRef<HTMLDivElement>(null);
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
      <Shapes ref={shapesRef} {...testId<TestId>('dx-layout', true)} classNames='absolute' layout={layout} />

      {/* Overlays. */}
      <div {...testId<TestId>('dx-overlays')} className={mx(eventsNone)}>
        {/* Selection overlay. */}
        {selectionRect && <SelectionBox rect={selectionRect} />}

        {/* Linking overlay. */}
        <div className='absolute' style={projectionStyles}>
          {overlay && <PathComponent debug={debug} scale={scale} shape={overlay} />}
        </div>

        {/* Misc overlay. */}
        <svg
          ref={overlaySvg}
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
