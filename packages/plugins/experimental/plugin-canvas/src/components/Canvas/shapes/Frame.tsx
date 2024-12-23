//
// Copyright 2024 DXOS.org
//

import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { type MouseEventHandler, useEffect, useMemo, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/react-ui-theme';

import { type BaseShapeProps, shapeAttrs } from './Shape';
import { type DragPayloadData, useEditorContext } from '../../../hooks';
import { pointAdd, getBoundsProperties } from '../../../layout';
import { type PolygonShape } from '../../../types';
import { ReadonlyTextBox, TextBox, type TextBoxProps } from '../../TextBox';
import { styles } from '../../styles';
import { DATA_SHAPE_ID, Anchor } from '../Anchor';

// TODO(burdon): Surface for form content. Or pass in children (which may include a Surface).
//  return <Surface ref={forwardRef} role='card' limit={1} data={{ content: object} />;

// NOTE: Delaying double-click detection makes select slow.
const DBLCLICK_TIMEOUT = 0;

export type FrameProps = BaseShapeProps<PolygonShape> & { showAnchors?: boolean };

/**
 * Draggable Frame around polygons.
 */
export const Frame = ({ classNames, shape, scale, selected, showAnchors, onSelect }: FrameProps) => {
  const { debug, linking, dragging, setDragging, editing, setEditing } = useEditorContext();
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

  // TODO(burdon): Generalize anchor points.
  const anchors = useMemo(() => {
    return showAnchors !== false && hovering
      ? [
          { id: 'w', pos: pointAdd(shape.center, { x: -shape.size.width / 2, y: 0 }) },
          { id: 'e', pos: pointAdd(shape.center, { x: shape.size.width / 2, y: 0 }) },
          { id: 'n', pos: pointAdd(shape.center, { x: 0, y: shape.size.height / 2 }) },
          { id: 's', pos: pointAdd(shape.center, { x: 0, y: -shape.size.height / 2 }) },
        ].filter(({ id }) => !linking || linking.anchor === id)
      : [];
  }, [showAnchors, hovering]);

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
        {/* TODO(burdon): Auto-expand height? Trigger layout? */}
        {(isEditing && <TextBox value={shape.text} centered onClose={handleClose} onCancel={handleCancel} />) || (
          <ReadonlyTextBox classNames={mx(debug && 'font-mono text-xs')} value={getLabel(shape, debug)} />
        )}
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

const getLabel = (shape: PolygonShape, debug = false) => {
  return debug ? [shape.id, shape.type, `(${shape.center.x},${shape.center.y})`].join('\n') : shape.text ?? shape.id;
};
