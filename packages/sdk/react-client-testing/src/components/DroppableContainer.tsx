//
// Copyright 2022 DXOS.org
//

import React, { CSSProperties, ReactNode } from 'react';
import { Droppable } from 'react-beautiful-dnd';

interface DroppableContainerProps {
  id: string
  children: ReactNode
  style?: CSSProperties
  horizontal?: boolean
}

export const DroppableContainer = ({
  id,
  children,
  style,
  horizontal = false
}: DroppableContainerProps) => {
  return (
    <Droppable droppableId={id} direction={horizontal ? 'horizontal' : 'vertical'}>
      {({ innerRef: droppableRef, placeholder }, { isDraggingOver }) => (
        <div
          ref={droppableRef}
          style={{
            ...style,
            backgroundColor: isDraggingOver ? 'rgba(0, 0, 0, 0.1)' : undefined,
            borderRadius: '0.5em',
            width: 'fit-content'
          }}
        >
          {children}
          {placeholder}
        </div>
      )}
    </Droppable>
  );
};
