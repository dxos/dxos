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
import { useProjection, type Dimension, type Point } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { type DragDropPayload, useEditorContext } from '../../hooks';
import { getBoundsProperties, pointAdd } from '../../layout';
import { type Polygon } from '../../types';
import { styles } from '../styles';

export const defaultAnchorSize: Dimension = { width: 12, height: 12 };

export type Anchor = {
  /** Id (e.g., property). */
  id: string;
  /** Parent shape id. */
  shape: string;
  /** Anchor center. */
  pos: Point;
};

export const defaultAnchors: Record<string, Point> = {
  w: { x: -1, y: 0 },
  e: { x: 1, y: 0 },
  n: { x: 0, y: 1 },
  s: { x: 0, y: -1 },
};

export const createAnchors = (
  { id, center, size: { width, height } }: Polygon,
  anchors: Record<string, Point> = defaultAnchors,
): Record<string, Anchor> => {
  return Object.entries(anchors).reduce(
    (map, [anchor, pos]) => {
      map[anchor] = {
        id: anchor,
        shape: id,
        pos: pointAdd(center, { x: (pos.x * width) / 2, y: (pos.y * height) / 2 }),
      };

      return map;
    },
    {} as Record<string, Anchor>,
  );
};

export type AnchorProps = ThemedClassName<{
  shape: Polygon;
  anchor: Anchor;
  size?: Dimension;
  onMouseLeave?: () => void;
}>;

/**
 * Anchor points for attaching links.
 */
export const Anchor = ({ classNames, shape, anchor, size = defaultAnchorSize, onMouseLeave }: AnchorProps) => {
  const { monitor } = useEditorContext();
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
        canDrop: () => monitor.canDrop({ type: 'anchor', shape, anchor }),
        onDragEnter: () => setActive(true),
        onDragLeave: () => setActive(false),
        onDrop: () => setActive(false),
      }),
      draggable({
        element: ref.current,
        getInitialData: () => ({ type: 'anchor', shape, anchor }) satisfies DragDropPayload,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            render: ({ container }) => {
              setPreview(container);
              return () => setPreview(undefined);
            },
          });
        },
        onDragStart: () => {
          monitor.start({ type: 'anchor', shape, anchor });
        },
      }),
    );
  }, [root, projection, monitor, shape, anchor]);

  return (
    <>
      <div
        ref={ref}
        style={getBoundsProperties({ ...anchor.pos, ...size })}
        className={mx('absolute', styles.anchor, classNames, active && styles.anchorActive)}
        title={anchor.id}
        onMouseLeave={() => onMouseLeave?.()}
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
