//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { type FC, type MouseEventHandler, useEffect, useMemo, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/react-ui-theme';

import { Anchor, getAnchors } from './Anchor';
import { DATA_SHAPE_ID, type ShapeComponentProps, shapeAttrs } from './Shape';
import { type DragPayloadData, useEditorContext } from '../../hooks';
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
  const { debug, linking, dragging, setDragging, editing, setEditing, registry } = useEditorContext();
  const isDragging = dragging?.shape.id === shape.id;
  const isEditing = editing?.shape.id === shape.id;
  const [hovering, setHovering] = useState(false);
  const [over, setOver] = useState(false);

  // Dragging.
  // TODO(burdon): Handle cursor dragging out of window (currently drop is lost/frozen).
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return combine(
      dropTargetForElements({
        element: ref.current,
        getData: () => ({ type: 'frame', shape }) satisfies DragPayloadData,
        onDragEnter: () => linking && setOver(true),
        onDragLeave: () => setOver(false),
        // getIsSticky: () => true,
        // canDrop: () => true,
      }),
      draggable({
        element: ref.current,
        getInitialData: () => ({ type: 'frame', shape }) satisfies DragPayloadData,
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          setCustomNativeDragPreview({
            nativeSetDragImage,
            getOffset: () => {
              return { x: (scale * shape.size.width) / 2, y: (scale * shape.size.height) / 2 };
            },
            render: ({ container }) => {
              setDragging({ shape, container });
            },
          });
        },
        onDrop: () => {
          setDragging(undefined);
        },
      }),
    );
  }, [scale, shape, linking]);

  // Reset hovering state once dragging ends.
  useEffect(() => {
    setHovering(false);
    setOver(false);
  }, [linking]);

  // Custom anchors.
  // TODO(burdon): Refresh when properties changed.
  const anchors = useMemo(() => {
    return showAnchors === false
      ? []
      : registry.getShape(shape.type)?.getAnchors?.(shape, linking) ?? getAnchors(shape, linking);
  }, [shape, hovering, showAnchors]);

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
    <div className={mx(isDragging && 'opacity-0')}>
      <div
        {...shapeAttrs(shape)}
        ref={ref}
        style={getBoundsProperties({ ...shape.center, ...shape.size })}
        className={mx(
          styles.frameContainer,
          styles.frameHover,
          styles.frameBorder,
          selected && styles.frameSelected,
          over && styles.frameActive,
          shape.guide && styles.frameGuide,
          classNames,
          'transition',
          debug && 'opacity-50',
          // scale >= 16 && 'duration-500 opacity-0',
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={(ev) => {
          // We need to keep rendering the anchor that is being dragged.
          const related = ev.relatedTarget as HTMLElement;
          if (related?.getAttribute?.(DATA_SHAPE_ID) !== shape.id) {
            setHovering(false);
          }
        }}
      >
        {Component && <Component {...baseProps} editing={isEditing} onClose={handleClose} onCancel={handleCancel} />}
      </div>

      {/* Anchors. */}
      <div>
        {anchors.map(({ id, pos }) => (
          <Anchor key={id} id={id} shape={shape} scale={scale} pos={pos} onMouseLeave={() => setHovering(false)} />
        ))}
      </div>
    </div>
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
