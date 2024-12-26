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
import { DATA_SHAPE_ID, type ShapeComponentProps, shapeAttrs } from './Shape';
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
  const { classNames, shape, scale, selected, onSelect } = baseProps;
  const { debug, monitor, linking, editing, setEditing, registry } = useEditorContext();
  const { styles: projectionStyles } = useProjection();
  const { container } = monitor.state('frame', shape.id).value;
  const isEditing = editing?.shape.id === shape.id;
  const [hover, setHover] = useState(false);

  // Dragging.
  // TODO(burdon): Handle cursor dragging out of window (currently drop is lost/frozen).
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return combine(
      dropTargetForElements({
        element: ref.current,
        getData: () => ({ type: 'frame', shape }) satisfies DragDropPayload,
        canDrop: () => false,
        onDragEnter: () => linking && setHover(true),
        onDragLeave: () => setHover(false),
      }),
      draggable({
        element: ref.current,
        getInitialData: () => ({ type: 'frame', shape }) satisfies DragDropPayload,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: () => {
              return { x: (scale * shape.size.width) / 2, y: (scale * shape.size.height) / 2 };
            },
            render: ({ container }) => {
              monitor.drag({ container, type: 'frame', shape });
            },
          });
        },
        onDrop: () => monitor.drop(),
      }),
    );
  }, [scale, shape, linking]);

  // Reset hovering state once dragging ends.
  useEffect(() => setHover(false), [linking]);

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
      <div className={mx(container && 'opacity-30')}>
        <div
          {...shapeAttrs(shape)}
          ref={ref}
          style={getBoundsProperties({ ...shape.center, ...shape.size })}
          className={mx(
            styles.frameContainer,
            styles.frameHover,
            styles.frameBorder,
            selected && styles.frameSelected,
            hover && styles.frameActive,
            shape.guide && styles.frameGuide,
            classNames,
            'transition',
            debug && 'opacity-50',
            // scale >= 16 && 'duration-500 opacity-0',
          )}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={(ev) => {
            // We need to keep rendering the anchor that is being dragged.
            const related = ev.relatedTarget as HTMLElement;
            if (related?.getAttribute?.(DATA_SHAPE_ID) !== shape.id) {
              setHover(false);
            }
          }}
        >
          {Component && <Component {...baseProps} editing={isEditing} onClose={handleClose} onCancel={handleCancel} />}
        </div>

        {/* Anchors. */}
        <div>
          {Object.entries(anchors).map(([anchor, { pos }]) => (
            <Anchor
              key={anchor}
              id={anchor}
              shape={shape}
              scale={scale}
              pos={pos}
              onMouseLeave={() => setHover(false)}
            />
          ))}
        </div>
      </div>

      {/* Drag preview (NOTE: styles should be included to apply scale). */}
      {container &&
        createPortal(
          <div style={projectionStyles}>
            <FrameDragPreview debug={debug} scale={scale} shape={shape} />
          </div>,
          container,
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
