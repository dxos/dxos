//
// Copyright 2022 DXOS.org
//

import React, { CSSProperties, ReactNode, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { DNDTypes } from './DragAndDropTypes';

interface DropResult {
  id: string
}

interface DraggableContainerDef {
  id: string
  index?: number
}

interface DraggableContainerProps {
  id: string
  type: DNDTypes
  onDrop: (dropTargetId: string, dragSourceId: string, index?: number) => void
  children?: ReactNode
  style?: CSSProperties
  index?: number
  moveItem?: (dragIndex: number, hoverIndex: number) => void
}

export const DraggableContainer = ({
  id,
  type,
  onDrop,
  children,
  style,
  index,
  moveItem
}: DraggableContainerProps) => {
  const ref = useRef<HTMLDivElement>(null);

  // Enables sortable behaviour (https://react-dnd.github.io/react-dnd/examples/sortable/simple).
  const [, drop] = useDrop<DraggableContainerDef>({
    accept: type,
    hover (item, monitor) {
      if (!ref.current || !item || (item.index !== 0 && !item.index) || (index !== 0 && !index)) {
        return;
      }
      const dragIndex = item.index;
      const hoverIndex = index;
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current?.getBoundingClientRect();
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) {
        return;
      }
      // Get pixels to the top
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      // Time to actually perform the action
      moveItem?.(dragIndex, hoverIndex);
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    }
  });

  const [{ isDragging }, drag] = useDrag(() => ({
    type,
    item: { id, index },
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<DropResult>();
      if (dropResult) {
        onDrop(dropResult.id, item.id, item.index);
      }
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  drag(drop(ref));
  return (
    <div
      ref={ref}
      style={{
        ...style,
        cursor: 'pointer',
        opacity: isDragging ? 0 : 1
      }}
    >
      {children}
    </div>
  );
};
