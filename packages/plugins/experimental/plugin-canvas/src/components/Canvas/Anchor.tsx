//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { dropTargetForElements, draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { type Dimension, type Point } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { DATA_SHAPE_ID } from './Shape';
import { type DragDropPayload, useEditorContext } from '../../hooks';
import { getBoundsProperties, pointAdd } from '../../layout';
import { type Polygon } from '../../types';
import { styles } from '../styles';

const defaultSize: Dimension = { width: 12, height: 12 };

export type Anchor = {
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

export const getAnchors = (
  { id, center, size: { width, height } }: Polygon,
  anchors: Record<string, Point> = defaultAnchors,
): Record<string, Anchor> => {
  return Object.entries(anchors).reduce(
    (map, [anchor, pos]) => {
      map[anchor] = { shape: id, pos: pointAdd(center, { x: (pos.x * width) / 2, y: (pos.y * height) / 2 }) };
      return map;
    },
    {} as Record<string, Anchor>,
  );
};

export type AnchorProps = {
  id: string; // E.g., "w", "w.1.4", "prop-1", "output", etc.
  shape: Polygon;
  pos: Point;
  size?: Dimension;
  scale?: number;
  onMouseLeave?: () => void;
};

/**
 * Anchor points for attaching links.
 */
export const Anchor = ({ id, shape, pos, size = defaultSize, scale = 1, onMouseLeave }: AnchorProps) => {
  const { linking, setLinking } = useEditorContext();
  const [hover, setHover] = useState(false);
  const isLinking = linking?.shape.id === shape.id && linking?.anchor === id;

  // Dragging.
  // TODO(burdon): ESC to cancel dragging.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return combine(
      dropTargetForElements({
        element: ref.current,
        getData: () => ({ type: 'anchor', shape, anchor: id }) satisfies DragDropPayload,
        canDrop: () => linking?.shape.id !== shape.id,
        onDragEnter: () => setHover(true),
        onDragLeave: () => setHover(false),
        onDrop: () => setHover(false),
      }),
      draggable({
        element: ref.current,
        getInitialData: () => ({ type: 'anchor', shape, anchor: id }) satisfies DragDropPayload,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: () => {
              return { x: (scale * size.width) / 2, y: (scale * size.height) / 2 };
            },
            render: ({ container }) => {
              setLinking({ container, shape, anchor: id });
            },
          });
        },
        onDrop: ({ location }) => {
          setLinking(undefined);
        },
      }),
    );
  }, [linking, pos]);

  return (
    <>
      <div
        ref={ref}
        {...{ [DATA_SHAPE_ID]: shape.id }}
        style={getBoundsProperties({ ...pos, ...size })}
        className={mx('absolute', styles.anchor, isLinking && 'opacity-0', hover && styles.anchorHover)}
        onMouseLeave={() => onMouseLeave?.()}
      />

      {isLinking &&
        createPortal(
          <div style={scale ? { transform: `scale(${scale})` } : undefined}>
            <div style={getBoundsProperties({ ...pos, ...size })} className={mx(styles.anchor)} />
          </div>,
          linking.container,
        )}
    </>
  );
};
