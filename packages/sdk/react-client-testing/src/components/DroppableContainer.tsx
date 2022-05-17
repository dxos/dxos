//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';
import { Droppable } from 'react-beautiful-dnd';

interface DroppableContainerProps {
  id: string
  children: ReactNode
  styles?: any
}

export const DroppableContainer = ({
  id,
  children,
  styles
}: DroppableContainerProps) => {
  return (
    <Droppable droppableId={id}>
      {({ innerRef: droppableRef, placeholder }, { isDraggingOver }) => (
        <div
          ref={droppableRef}
          style={{
            ...styles,
            backgroundColor: isDraggingOver ? 'rgba(0, 0, 0, 0.1)' : undefined,
            borderRadius: '0.5em'
          }}
        >
          {children}
          {placeholder}
        </div>
      )}
    </Droppable>
  );
};
