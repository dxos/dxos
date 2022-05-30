//
// Copyright 2022 DXOS.org
//
import React, { CSSProperties, ReactNode, useRef } from 'react';
import { useDrop } from 'react-dnd';

import { DNDTypes, DragItem } from './DragAndDropTypes';

interface DroppableContainerProps {
  id: string
  accept: DNDTypes
  children?: ReactNode
  style?: CSSProperties
  hideBorder?: boolean
}

export const DroppableContainer = ({
  id,
  accept,
  children,
  style = {},
  hideBorder = false
}: DroppableContainerProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [{ canDrop, isOver }, drop] = useDrop<
    DragItem,
    unknown,
    { canDrop: boolean, isOver: boolean }
  >({
    accept,
    collect (monitor) {
      return {
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop()
      };
    },
    drop: () => ({ id })
  });

  let border;
  if (!hideBorder) {
    const isActive = canDrop && isOver;
    border = '1px solid rgba(0, 0, 0, 0.2)';
    if (isActive) {
      border = '1px solid rgba(0, 0, 0, 0.8)';
    } else if (canDrop) {
      border = '1px solid rgba(0, 0, 0, 0.5)';
    }
  }

  drop(ref);
  return (
    <div ref={ref} style={{ ...style, border }}>
      {children}
    </div>
  );
};
