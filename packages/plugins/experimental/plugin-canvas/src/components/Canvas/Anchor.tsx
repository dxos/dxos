//
// Copyright 2024 DXOS.org
//

import { draggable } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { type Dimension, type Point } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { type DragPayloadData, useEditorContext } from '../../hooks';
import { getBoundsProperties } from '../../layout';
import { type PolygonShape } from '../../types';
import { styles } from '../styles';

export const DATA_SHAPE_ID = 'data-shape-id';

const defaultSize: Dimension = { width: 12, height: 12 };

export type AnchorProps = {
  id: string;
  shape: PolygonShape;
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
  const isLinking = linking?.shape.id === shape.id && linking?.anchor === id;

  // Dragging.
  // TODO(burdon): ESC to cancel dragging.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return draggable({
      element: ref.current,
      getInitialData: () => ({ type: 'anchor', shape, anchor: id }) satisfies DragPayloadData,
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
    });
  }, [pos]);

  return (
    <>
      <div
        ref={ref}
        {...{ [DATA_SHAPE_ID]: shape.id }}
        style={getBoundsProperties({ ...pos, ...size })}
        className={mx('absolute', styles.anchor, isLinking && 'opacity-0')}
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
