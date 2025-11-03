//
// Copyright 2024 DXOS.org
//

import { dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import React, { type PropsWithChildren, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Grid, Canvas as NaturalCanvas, type Rect, testId, useCanvasContext, useWheel } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

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
export const Canvas = ({ children }: PropsWithChildren) => (
  <NaturalCanvas {...testId<TestId>('dx-canvas')}>
    <CanvasContent>{children}</CanvasContent>
  </NaturalCanvas>
);

export const CanvasContent = ({ children }: PropsWithChildren) => {
  const { dragMonitor, overlayRef, options, showGrid, selection } = useEditorContext();
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
      {showGrid && <Grid size={options.gridSize} scale={scale} offset={offset} classNames={styles.gridLine} />}

      {/* Layout. */}
      {<Shapes {...testId<TestId>('dx-layout', true)} ref={shapesRef} layout={layout} />}

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

const SelectionBox = ({ rect }: { rect: Rect }) => (
  <svg className='absolute overflow-visible cursor-crosshair' width={1} height={1}>
    <rect {...rect} className={styles.cursor} />
  </svg>
);
