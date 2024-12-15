//
// Copyright 2024 DXOS.org
//

import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { type MouseEventHandler, type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { DATA_ITEM_ID, Anchor } from './Anchor';
import { type DragPayloadData } from './Shape';
import { type Shape } from '../../graph';
import { useEditorContext } from '../../hooks';
import { pointAdd, getBoundsProperties } from '../../layout';
import { ReadonlyTextBox, TextBox, type TextBoxProps } from '../TextBox';
import { styles } from '../styles';

// TODO(burdon): Surface for form content. Or pass in children (which may include a Surface).
//  return <Surface ref={forwardRef} role='card' limit={1} data={{ content: object} />;

export type FrameProps = PropsWithChildren<
  ThemedClassName<{
    shape: Shape;
    scale?: number;
    selected?: boolean;
    showAnchors?: boolean;
    onSelect?: (id: string, shift: boolean) => void;
  }>
>;

/**
 * Draggable Frame around shapes.
 */
export const Frame = ({ classNames, shape, scale, selected, showAnchors, onSelect }: FrameProps) => {
  const { linking, dragging, setDragging, editing, setEditing } = useEditorContext();
  const isDragging = dragging?.shape.id === shape.id;
  const isEditing = editing?.shape.id === shape.id;
  const [hovering, setHovering] = useState(false);

  invariant(shape.type === 'rect'); // TODO(burdon): ???

  // Dragging.
  // TODO(burdon): Handle cursor dragging out of window (currently drop is lost/frozen).
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return draggable({
      element: ref.current,
      getInitialData: () => ({ type: 'frame', shape }) satisfies DragPayloadData,
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: () => {
            // TODO(burdon): Calc offset.
            return { x: shape.size.width / 2, y: shape.size.height / 2 };
          },
          render: ({ container }) => {
            setDragging({ shape, container });
            return () => {};
          },
        });
      },
      onDrop: () => {
        setDragging(undefined);
      },
    });
  }, [shape]);

  // Drop targets for linking.
  useEffect(() => {
    invariant(ref.current);
    return dropTargetForElements({
      element: ref.current,
      getData: () => ({ type: 'frame', shape }) satisfies DragPayloadData,
    });
  });

  // Reset hovering state once dragging ends.
  useEffect(() => {
    setHovering(false);
  }, [linking]);

  // TODO(burdon): Generalize anchor points.
  const anchors =
    showAnchors !== false && hovering
      ? [
          { id: 'w', pos: pointAdd(shape.pos, { x: -shape.size.width / 2, y: 0 }) },
          { id: 'e', pos: pointAdd(shape.pos, { x: shape.size.width / 2, y: 0 }) },
          { id: 'n', pos: pointAdd(shape.pos, { x: 0, y: shape.size.height / 2 }) },
          { id: 's', pos: pointAdd(shape.pos, { x: 0, y: -shape.size.height / 2 }) },
        ].filter(({ id }) => !linking || linking.anchor === id)
      : [];

  const handleClick: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (!editing) {
      onSelect?.(shape.id, ev.shiftKey);
    }
  };

  const handleDoubleClick: MouseEventHandler<HTMLDivElement> = () => {
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
        ref={ref}
        style={getBoundsProperties({ ...shape.pos, ...shape.size })}
        className={mx(styles.frameContainer, styles.frameBorder, selected && styles.frameSelected, classNames)}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={(ev) => {
          // We need to keep rendering the anchor that is being dragged.
          const related = ev.relatedTarget as HTMLElement;
          if (related?.getAttribute(DATA_ITEM_ID) !== shape.id) {
            setHovering(false);
          }
        }}
      >
        {/* TODO(burdon): Auto-expand height? Trigger layout? */}
        {(isEditing && <TextBox value={shape.text} onClose={handleClose} onCancel={handleCancel} />) || (
          <ReadonlyTextBox value={shape.text ?? shape.id} />
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
  invariant(shape.type === 'rect'); // TODO(burdon): ???

  return (
    <div
      style={getBoundsProperties({ ...shape.pos, ...shape.size })}
      className={mx(styles.frameContainer, styles.frameBorder)}
    >
      <ReadonlyTextBox value={shape.text ?? shape.id} />
    </div>
  );
};
