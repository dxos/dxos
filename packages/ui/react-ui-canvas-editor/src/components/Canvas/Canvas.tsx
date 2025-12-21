//
// Copyright 2024 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { type PropsWithChildren, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import {
  Grid,
  Canvas as NaturalCanvas,
  type Rect,
  testId,
  useCanvasContext,
  useDrag,
  useWheel,
} from '@dxos/react-ui-canvas';
import { mx } from '@dxos/ui-theme';

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

import { Frame } from './Frame';
import { getShapeBounds } from './Shape';
import { Shapes } from './Shapes';

/**
 * Main canvas component.
 */
export const Canvas = ({ children }: PropsWithChildren) => {
  return (
    <NaturalCanvas {...testId<TestId>('dx-canvas')}>
      <CanvasContent>{children}</CanvasContent>
    </NaturalCanvas>
  );
};

export const CanvasContent = ({ children }: PropsWithChildren) => {
  const { dragMonitor, overlayRef, options, selection, showGrid } = useEditorContext();
  const { root, styles: projectionStyles, scale, offset } = useCanvasContext();
  const shapesRef = useRef<HTMLDivElement>(null);

  const dragging = dragMonitor.state((state) => state.type === 'tool').value;

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
  useDrag();

  // Dragging and linking.
  useDragMonitor();

  // Layout.
  const layout = useLayout();

  // Selection.
  const selectionRect = useSelectionEvents(root, ({ bounds, subtract }) => {
    // NOTE: bounds will be undefined if clicking on an object.
    if (!bounds) {
      selection.clear();
    } else {
      selection.setSelected(
        layout.shapes
          .filter((shape) => {
            const rect = getShapeBounds(shapesRef.current!, shape.id);
            return rect && rectContains(bounds, rect);
          })
          .map((shape) => shape.id),
        subtract,
      );
    }
  });

  return (
    <>
      {/* Grid. */}
      {showGrid && (
        <Grid size={options.gridSize} showAxes={false} scale={scale} offset={offset} classNames={styles.gridLine} />
      )}

      {/* Layout. */}
      {<Shapes {...testId<TestId>('dx-layout', true)} layout={layout} ref={shapesRef} />}

      {/* External content. */}
      {children}

      {/* Overlays. */}
      <div {...testId<TestId>('dx-overlays')} className={mx(eventsNone)}>
        {/* Selection overlay. */}
        {selectionRect && <SelectionBox rect={selectionRect} />}

        {/* Tool dragging. */}
        {dragging.type === 'tool' &&
          createPortal(
            <div style={projectionStyles}>
              <Frame shape={dragging.shape} />
            </div>,
            dragging.container,
          )}

        {/* Misc overlay. */}
        <svg
          ref={overlayRef}
          style={projectionStyles}
          className='absolute overflow-visible pointer-events-none'
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
