//
// Copyright 2022 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { CSSProperties, ReactNode } from 'react';

const DEFAULT_DRAGGING_OVER_STYLES = {
  border: '1px solid rgba(0, 0, 0, 0.7)'
};

export interface DroppableContainerProps {
  id: string
  children: ReactNode
  style?: CSSProperties
  draggingOverStyle?: CSSProperties
}

export const DroppableContainer = ({
  id,
  children,
  style,
  draggingOverStyle = DEFAULT_DRAGGING_OVER_STYLES
}: DroppableContainerProps) => {
  const { isOver, setNodeRef, over } = useDroppable({ id });

  // TODO(kaplanski): Is this a dnd-kit bug or is there a better way of checking?
  // When hovering over item, isOver returns false and over id doesn't match container id, so manually check current sortable containerId.
  const isOverContainer = isOver || over?.id === id || over?.data.current?.sortable.containerId === id;

  return (
    <div
      ref={setNodeRef}
      style={{
        width: 'fit-content',
        ...style,
        ...(isOverContainer && draggingOverStyle)
      }}
    >
      {children}
    </div>
  );
};
