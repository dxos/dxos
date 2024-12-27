//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { dropTargetForElements, draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { useProjection, type Dimension, type Point } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { DATA_SHAPE_ID } from './Shape';
import { type DragDropPayload, useEditorContext } from '../../hooks';
import { getBoundsProperties, getInputPoint, pointAdd } from '../../layout';
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
  id: string; // E.g., "w", "w.1.4", "prop-1", "#output", etc.
  shape: Polygon;
  pos: Point;
  size?: Dimension;
  onMouseLeave?: () => void;
};

/**
 * Anchor points for attaching links.
 */
export const Anchor = ({ id, shape, pos, size = defaultSize, onMouseLeave }: AnchorProps) => {
  const { monitor } = useEditorContext();
  const { root, projection } = useProjection();
  const { container } = monitor.state(
    ({ type, shape: active, anchor }) => type === 'anchor' && active?.id === shape.id && anchor === id,
  ).value;

  const [active, setActive] = useState(false);

  // Dragging.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return combine(
      dropTargetForElements({
        element: ref.current,
        getData: () => ({ type: 'anchor', shape, anchor: id }) satisfies DragDropPayload,
        canDrop: () => monitor.canDrop({ type: 'anchor', shape, anchor: id }),
        onDragEnter: () => setActive(true),
        onDragLeave: () => setActive(false),
        onDrop: () => setActive(false),
      }),
      draggable({
        element: ref.current,
        getInitialData: () => ({ type: 'anchor', shape, anchor: id }) satisfies DragDropPayload,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: () => {
              return { x: (projection.scale * size.width) / 2, y: (projection.scale * size.height) / 2 };
            },
            render: ({ container }) => {
              monitor.preview({ container, type: 'anchor', shape, anchor: id });
            },
          });
        },
        onDrag: ({ location }) => {
          const [pos] = projection.toModel([getInputPoint(root, location.current.input)]);
          monitor.drag({ pos });
        },
        onDrop: () => {
          monitor.drop();
        },
      }),
    );
  }, []);

  return (
    <>
      <div
        ref={ref}
        {...{ [DATA_SHAPE_ID]: shape.id }}
        style={getBoundsProperties({ ...pos, ...size })}
        className={mx('absolute', styles.anchor, active && styles.anchorActive)}
        onMouseLeave={() => onMouseLeave?.()}
      />

      {container &&
        createPortal(
          <div style={{ transform: `scale(${projection.scale})` }}>
            <div style={getBoundsProperties({ ...pos, ...size })} className={mx(styles.anchor)} />
          </div>,
          container,
        )}
    </>
  );
};
