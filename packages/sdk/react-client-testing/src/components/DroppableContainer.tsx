//
// Copyright 2022 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { CSSProperties, ReactNode } from 'react';

interface DroppableContainerProps {
  id: string
  children: ReactNode
  style?: CSSProperties
  draggingOverStyle?: CSSProperties
}

export const DroppableContainer = ({
  id,
  children,
  style,
  draggingOverStyle
}: DroppableContainerProps) => {
  const { isOver, setNodeRef, over } = useDroppable({
    id
  });

  // When hovering over item, isOver returns false and over id doesn't match container id, so manually check current sortable containerId.
  const isOverContainer = isOver || over?.id === id || over?.data.current?.sortable.containerId === id;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(isOverContainer && draggingOverStyle)
      }}
    >
      {children}
    </div>
  );
};
