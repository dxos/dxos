//
// Copyright 2022 DXOS.org
//

import React, { CSSProperties, ReactNode } from 'react';
import { Droppable } from 'react-beautiful-dnd';

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
  draggingOverStyle,
  horizontal = false
}: DroppableContainerProps) => {
  return (
    <Droppable droppableId={id} direction={horizontal ? 'horizontal' : 'vertical'}>
      {({ innerRef: droppableRef, placeholder }, { isDraggingOver }) => (
        <div
          ref={droppableRef}
          style={{
            ...style,
            ...(isDraggingOver ? draggingOverStyle : {})
          }}
        >
          {children}
          {placeholder}
        </div>
      )}
    </Droppable>
  );
};
