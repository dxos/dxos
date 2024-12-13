//
// Copyright 2024 DXOS.org
//

import { draggable, dropTargetForElements } from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import React, { type MouseEventHandler, type PropsWithChildren, useEffect, useRef, useState } from 'react';

import { invariant } from '@dxos/invariant';
import { mx } from '@dxos/react-ui-theme';

import { Anchor, DATA_ITEM_ID } from './Anchor';
import { type DragPayloadData, type Item } from './Shape';
import { useEditorContext } from '../../hooks';
import { pointAdd, getBoundsProperties } from '../../layout';
import { ReadonlyTextBox, TextBox, type TextBoxProps } from '../TextBox';
import { styles } from '../styles';

// TODO(burdon): Surface for form content. Or pass in children (which may include a Surface).
//  return <Surface ref={forwardRef} role='card' limit={1} data={{ content: object} />;

export type FrameProps = PropsWithChildren<{
  item: Item;
  scale?: number;
  selected?: boolean;
  showAnchors?: boolean;
  onSelect?: (item: Item, shift: boolean) => void;
}>;

/**
 * Draggable Frame around shapes.
 */
export const Frame = ({ item, scale, selected, showAnchors, onSelect }: FrameProps) => {
  const { linking, dragging, setDragging, editing, setEditing } = useEditorContext();
  const isDragging = dragging?.item.id === item.id;
  const isEditing = editing?.item.id === item.id;
  const [hovering, setHovering] = useState(false);

  // Dragging.
  // TODO(burdon): Handle cursor dragging out of window (currently drop is lost/frozen).
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    invariant(ref.current);
    return draggable({
      element: ref.current,
      getInitialData: () => ({ type: 'frame', item }) satisfies DragPayloadData,
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          getOffset: () => {
            // TODO(burdon): Calc offset.
            return { x: item.size.width / 2, y: item.size.height / 2 };
          },
          render: ({ container }) => {
            setDragging({ item, container });
            return () => {};
          },
        });
      },
      onDrop: () => {
        setDragging(undefined);
      },
    });
  }, [item]);

  // Drop targets for linking.
  useEffect(() => {
    invariant(ref.current);
    return dropTargetForElements({
      element: ref.current,
      getData: () => ({ type: 'frame', item }) satisfies DragPayloadData,
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
          { id: 'w', pos: pointAdd(item.pos, { x: -item.size.width / 2, y: 0 }) },
          { id: 'e', pos: pointAdd(item.pos, { x: item.size.width / 2, y: 0 }) },
          { id: 'n', pos: pointAdd(item.pos, { x: 0, y: item.size.height / 2 }) },
          { id: 's', pos: pointAdd(item.pos, { x: 0, y: -item.size.height / 2 }) },
        ].filter(({ id }) => !linking || linking.anchor === id)
      : [];

  const handleClick: MouseEventHandler<HTMLDivElement> = (ev) => {
    if (!editing) {
      onSelect?.(item, ev.shiftKey);
    }
  };

  const handleDoubleClick: MouseEventHandler<HTMLDivElement> = () => {
    setEditing({ item });
  };

  const handleClose: TextBoxProps['onClose'] = (value: string) => {
    item.text = value;
    setEditing(undefined);
  };

  const handleCancel: TextBoxProps['onCancel'] = () => {
    setEditing(undefined);
  };

  return (
    <>
      <div role='none' className={mx(isDragging && 'opacity-0')}>
        <div
          ref={ref}
          style={getBoundsProperties({ ...item.pos, ...item.size })}
          className={mx(styles.frameContainer, styles.frameBorder, selected && styles.frameSelected)}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onMouseEnter={() => setHovering(true)}
          onMouseLeave={(ev) => {
            // TODO(burdon): Need to detech if mouse leaves anchor.
            // We need to keep rendering the anchor that is being dragged.
            const related = ev.relatedTarget as HTMLElement;
            if (related?.getAttribute(DATA_ITEM_ID) !== item.id) {
              setHovering(false);
            }
          }}
        >
          {/* TODO(burdon): Auto-expand height? Trigger layout? */}
          {(isEditing && <TextBox value={item.text} onClose={handleClose} onCancel={handleCancel} />) || (
            <ReadonlyTextBox value={item.text ?? item.id} />
          )}
        </div>

        {/* Anchors. */}
        <div>
          {anchors.map(({ id, pos }) => (
            <Anchor key={id} id={id} item={item} scale={scale} pos={pos} onMouseLeave={() => setHovering(false)} />
          ))}
        </div>
      </div>
    </>
  );
};

export const FrameDragPreview = ({ item }: FrameProps) => {
  return (
    <div
      style={getBoundsProperties({ ...item.pos, ...item.size })}
      className={mx(styles.frameContainer, styles.frameBorder)}
    >
      <ReadonlyTextBox value={item.text ?? item.id} />
    </div>
  );
};
