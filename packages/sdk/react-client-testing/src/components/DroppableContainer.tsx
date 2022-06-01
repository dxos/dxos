//
// Copyright 2022 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { CSSProperties, ReactNode, useEffect } from 'react';

interface DroppableContainerProps {
  id: string
  children: ReactNode
  style?: CSSProperties
  draggingOverStyle?: CSSProperties
  horizontal?: boolean
}

export const DroppableContainer = ({
  id,
  children,
  style,
  draggingOverStyle
}: DroppableContainerProps) => {
  const { isOver, setNodeRef } = useDroppable({
    id
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...(isOver && draggingOverStyle)
      }}
    >
      {children}
    </div>
  );
};
