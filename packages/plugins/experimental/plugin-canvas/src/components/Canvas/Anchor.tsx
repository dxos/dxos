//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { dropTargetForElements, draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { useProjection, type Dimension } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { type DragDropPayload, useEditorContext } from '../../hooks';
import { getBoundsProperties } from '../../layout';
import { type Polygon } from '../../types';
import { type Anchor } from '../anchors';
import { styles } from '../styles';

export const defaultAnchorSize: Dimension = { width: 12, height: 12 };

export type AnchorProps = ThemedClassName<{
  shape: Polygon;
  anchor: Anchor;
  size?: Dimension;
}>;

/**
 * Anchor points for attaching links.
 */
export const AnchorComponent = ({ classNames, shape, anchor, size = defaultAnchorSize }: AnchorProps) => {
  const { dragMonitor } = useEditorContext();
  const { root, projection } = useProjection();

  const [preview, setPreview] = useState<HTMLElement>();
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
          setCustomNativeDragPreview({
            render: ({ container }) => {
              setPreview(container);
              return () => setPreview(undefined);
            },
            nativeSetDragImage,
          });
        },
        onDragStart: () => {
          dragMonitor.start({ type: 'anchor', shape, anchor });
        },
      }),
    );
  }, [root, projection, dragMonitor, shape, anchor]);

  return (
    <>
      <div
        ref={ref}
        style={getBoundsProperties({ ...anchor.pos, ...size })}
        className={mx('absolute', styles.anchor, classNames, active && styles.anchorActive)}
        title={anchor.id}
      />

      {preview &&
        createPortal(
          <div style={{ transform: `scale(${projection.scale})` }}>
            <div style={getBoundsProperties({ ...anchor.pos, ...size })} />
          </div>,
          preview,
        )}
    </>
  );
};
