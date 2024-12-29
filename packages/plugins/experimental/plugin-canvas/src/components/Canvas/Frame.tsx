//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { type FC, type MouseEventHandler, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { invariant } from '@dxos/invariant';
import { useProjection } from '@dxos/react-ui-canvas';
import { mx } from '@dxos/react-ui-theme';

import { Anchor } from './Anchor';
import { type ShapeComponentProps, shapeAttrs } from './Shape';
import { type DragDropPayload, useEditorContext } from '../../hooks';
import { getBoundsProperties } from '../../layout';
import { type Polygon } from '../../types';
import { ReadonlyTextBox, type TextBoxProps } from '../TextBox';
import { styles } from '../styles';

// TODO(burdon): Surface for form content. Or pass in children (which may include a Surface).
//  return <Surface ref={forwardRef} role='card' limit={1} data={{ content: object} />;

// NOTE: Delaying double-click detection makes select slow.
const DBLCLICK_TIMEOUT = 0;

export type FrameProps = ShapeComponentProps<Polygon> & {
  Component?: FC<FrameProps>;
  editing?: boolean;
  showAnchors?: boolean;
  onClose?: (value: string) => void;
  onCancel?: () => void;
};

/**
 * Draggable Frame around polygons.
 */
export const Frame = ({ Component, showAnchors, ...baseProps }: FrameProps) => {
  const { classNames, shape, selected, onSelect } = baseProps;
  const { debug, monitor, registry, editing, setEditing } = useEditorContext();
  const { root, projection, styles: projectionStyles } = useProjection();

  const dragging = monitor.state((state) => state.type === 'frame' && state.shape.id === shape.id).value;
  const isEditing = editing?.shape.id === shape.id;
  const [active, setActive] = useState(false);

  // Dragging.
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return combine(
      dropTargetForElements({
        element: ref.current,
        getData: () => ({ type: 'frame', shape }) satisfies DragDropPayload,
        canDrop: () => monitor.canDrop({ type: 'frame', shape }),
        onDragEnter: () => setActive(true),
        onDragLeave: () => setActive(false),
        onDrop: () => setActive(false),
      }),
      draggable({
        element: ref.current,
        getInitialData: () => ({ type: 'frame', shape }) satisfies DragDropPayload,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: () => {
              return { x: (projection.scale * shape.size.width) / 2, y: (projection.scale * shape.size.height) / 2 };
            },
            render: ({ container }) => {
              monitor.preview({ type: 'frame', shape, container });
            },
          });
        },
      }),
    );
  }, [root, projection, monitor, shape]);

  // Custom anchors.
  const anchors = useMemo(
    () => registry.getShape(shape.type)?.getAnchors?.(shape) ?? [],
    [shape.center, shape.size.height],
  );

  const clickTimer = useRef<number>();
  const handleClick: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (ev.detail === 1 && !editing) {
      clickTimer.current = window.setTimeout(() => {
        onSelect?.(shape.id, ev.shiftKey);
      }, DBLCLICK_TIMEOUT);
    }
  };

  const handleDoubleClick: MouseEventHandler<HTMLDivElement> = () => {
    clearTimeout(clickTimer.current);
    setEditing({ shape });
  };

  const handleClose: TextBoxProps['onClose'] = (value: string) => {
    shape.text = value;
    setEditing(undefined);
  };

  const handleCancel: TextBoxProps['onCancel'] = () => {
    setEditing(undefined);
  };

  return (
    <>
      <div className={mx(dragging.type === 'frame' && 'opacity-0')}>
        <div
          {...shapeAttrs(shape)}
          ref={ref}
          style={getBoundsProperties({ ...shape.center, ...shape.size })}
          className={mx(
            styles.frameContainer,
            styles.frameHover,
            styles.frameBorder,
            selected && styles.frameSelected,
            active && styles.frameActive,
            shape.guide && styles.frameGuide,
            classNames,
            'transition',
            debug && 'opacity-50',
          )}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          // onMouseEnter={() => setActive(true)}
          // onMouseLeave={(ev) => {
          //   // We need to keep rendering the anchor that is being dragged.
          //   const related = ev.relatedTarget as HTMLElement;
          //   if (related?.getAttribute?.(DATA_SHAPE_ID) !== shape.id) {
          //     setActive(false);
          //   }
          // }}
        >
          {Component && <Component {...baseProps} editing={isEditing} onClose={handleClose} onCancel={handleCancel} />}
        </div>

        {/* Anchors. */}
        <div>
          {Object.values(anchors).map((anchor) => (
            <Anchor
              key={anchor.id}
              id={anchor.id}
              shape={shape}
              anchor={anchor}
              onMouseLeave={() => setActive(false)}
            />
          ))}
        </div>
      </div>

      {/* Drag preview (NOTE: styles should be included to apply scale). */}
      {/* TODO(burdon): Should render anchors also. */}
      {dragging.type === 'frame' &&
        createPortal(
          <div style={projectionStyles}>
            <FrameDragPreview debug={debug} shape={shape} />
          </div>,
          dragging.container,
        )}
    </>
  );
};

export const FrameDragPreview = ({ shape }: FrameProps) => {
  return (
    <div
      style={getBoundsProperties({ ...shape.center, ...shape.size })}
      className={mx(styles.frameContainer, styles.frameBorder)}
    >
      <ReadonlyTextBox value={shape.text ?? shape.id} />
    </div>
  );
};
