//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { disableNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/disable-native-drag-preview';
import React, { useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { type Dimension, useCanvasContext } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/ui-theme';

import { type DragDropPayload, useEditorContext } from '../../hooks/index.ts';
import { getBoundsProperties } from '../../layout/index.ts';
import { type Polygon } from '../../types/index.ts';
import { type Anchor, resizeCursor } from '../anchors.ts';
import { styles } from '../styles.tsx';
import { anchorAttrs, defaultAnchorSize } from './anchor-defs.ts';

export type AnchorProps = ThemedClassName<{
  type: 'anchor' | 'resize';
  shape: Polygon;
  anchor: Anchor;
  size?: Dimension;
}>;

/**
 * Anchor points for attaching links.
 */
export const AnchorComponent = ({ classNames, type, shape, anchor, size = defaultAnchorSize }: AnchorProps) => {
  const { dragMonitor } = useEditorContext();
  const { root, projection } = useCanvasContext();

  const [active, setActive] = useState(false);

  // Dragging.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return combine(
      dropTargetForElements({
        element: ref.current,
        getData: () => ({ type: 'anchor', shape, anchor }) satisfies DragDropPayload,
        canDrop: () => dragMonitor.canDrop({ type: 'anchor', shape, anchor }),
        onDragEnter: () => setActive(true),
        onDragLeave: () => setActive(false),
        onDrop: () => setActive(false),
      }),
      draggable({
        element: ref.current,
        getInitialData: () => ({ type: 'anchor', shape, anchor }) satisfies DragDropPayload,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          disableNativeDragPreview({ nativeSetDragImage });
        },
        onDragStart: () => {
          dragMonitor.start({ type, shape, anchor, initial: { ...shape.center, ...shape.size } });
        },
      }),
    );
  }, [root, projection, dragMonitor, shape, anchor]);

  return (
    <>
      <div
        ref={ref}
        {...anchorAttrs(shape, anchor)}
        style={getBoundsProperties({ ...anchor.pos, ...size })}
        className={mx(
          'absolute',
          type === 'anchor' && styles.anchor,
          type === 'resize' && [styles.resizeBorder, styles.resizeAnchor, resizeCursor[anchor.id]],
          classNames,
          active && styles.anchorActive,
        )}
        title={anchor.id}
      />
    </>
  );
};
