//
// Copyright 2024 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Canvas as NativeCanvas, Grid, type Rect, testId, useWheel, useProjection } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { FrameDragPreview, getShapeBounds, Line, Shapes } from './shapes';
import {
  useActionHandler,
  useDragMonitor,
  useEditorContext,
  useLayout,
  useSelectionEvents,
  useShortcuts,
} from '../../hooks';
import { rectContains } from '../../layout';
import { eventsNone, styles } from '../styles';

/**
 * Main canvas component.
 */
export const Canvas = () => {
  // TODO(burdon): Controller.
  return (
    <NativeCanvas {...testId('dx-canvas')}>
      <CanvasContent />
    </NativeCanvas>
  );
};

export const CanvasContent = () => {
  const { id, options, debug, graph, showGrid, dragging, selection } = useEditorContext();
  const { root, styles: transformStyles, setProjection, scale, offset } = useProjection();

  // Actions.
  useActionHandler();

  // Drop target.
  useEffect(() => {
    if (!root) {
      return;
    }

    return dropTargetForElements({
      element: root,
      getData: () => ({ type: 'canvas' }),
      canDrop: () => true,
    });
  }, [root]);

  // Keyboard shortcuts.
  useShortcuts();

  // Pan and zoom.
  useWheel(root, setProjection);

  // Dragging and linking.
  const { frameDragging, overlay } = useDragMonitor(root);

  // Layout.
  const layout = useLayout(graph, frameDragging, debug);

  // Selection.
  const shapesRef = useRef<HTMLDivElement>(null);
  const selectionRect = useSelectionEvents(root, ({ bounds }) => {
    if (!bounds) {
      selection.clear();
      root.click();
    } else {
      selection.setSelected(
        layout.shapes
          .filter((shape) => {
            const rect = getShapeBounds(shapesRef.current!, shape.id);
            return rect && rectContains(bounds, rect);
          })
          .map((shape) => shape.id),
      );
    }
  });

  return (
    <>
      {/* Background. */}
      <Background />

      {/* Grid. */}
      {showGrid && <Grid id={id} size={options.gridSize} scale={scale} offset={offset} classNames={styles.gridLine} />}

      {/* Content. */}
      <div ref={shapesRef} {...testId('dx-layout', true)} style={transformStyles} className='absolute'>
        <Shapes layout={layout} />
      </div>

      {/* Overlays. */}
      <div {...testId('dx-overlays')} className={mx(eventsNone)}>
        {/* Selection overlay. */}
        {selectionRect && <SelectionBox rect={selectionRect} />}

        {/* Drag preview (NOTE: styles should be included to apply scale). */}
        {dragging &&
          createPortal(
            <div style={transformStyles}>
              <FrameDragPreview scale={scale} shape={dragging.shape} />
            </div>,
            dragging.container,
          )}

        {/* Linking overlay. */}
        <div className='absolute' style={transformStyles}>
          {overlay && <Line scale={scale} shape={overlay} />}
        </div>
      </div>
    </>
  );
};

const Background = () => {
  return <div {...testId('dx-background')} className={mx('absolute inset-0 bg-base', eventsNone)} />;
};

const SelectionBox = ({ rect }: { rect: Rect }) => {
  return (
    <svg className='absolute overflow-visible cursor-crosshair'>
      <rect {...rect} className={styles.cursor} />
    </svg>
  );
};
