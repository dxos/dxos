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
            borderRadius: '0.5em',
            ...style,
            border: isDraggingOver ? '1px solid rgba(0, 0, 0, 0.7)' : (style?.border ?? '1px solid rgba(0,0,0,0.2)')
          }}
        >
          {children}
          {placeholder}
        </div>
      )}
    </Droppable>
  );
};
