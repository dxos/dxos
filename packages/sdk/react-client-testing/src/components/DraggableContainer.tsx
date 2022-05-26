//
// Copyright 2022 DXOS.org
//

import React, { CSSProperties, ReactNode, useState } from 'react';
import { Draggable } from 'react-beautiful-dnd';

interface DraggableContainerProps {
  id: string
  index: number,
  children: ReactNode
  style?: CSSProperties
}

export const DraggableContainer = ({
  id,
  index,
  children,
  style
}: DraggableContainerProps) => {
  const [isHovering, setIsHovering] = useState(false);

  const getStyles = (isDragging: boolean, isHovering: boolean) => {
    let backgroundColor;
    let boxShadow;
    if (isDragging) {
      backgroundColor = '#D8D8D8';
      boxShadow = `
        0 1px 1px hsl(0deg 0% 0% / 0.075),
        0 2px 2px hsl(0deg 0% 0% / 0.075),
        0 4px 4px hsl(0deg 0% 0% / 0.075),
        0 8px 8px hsl(0deg 0% 0% / 0.075),
        0 16px 16px hsl(0deg 0% 0% / 0.075)
      `;
    }
    if (isHovering) {
      backgroundColor = '#E8E8E8';
    }
    return {
      backgroundColor,
      boxShadow,
      borderRadius: '0.1em',
      width: 'fit-content'
    };
  };

  return (
    <Draggable
      key={id}
      draggableId={id}
      index={index}
    >
      {({ draggableProps, dragHandleProps, innerRef }, { isDragging }) => (
        <div
          ref={innerRef}
          {...draggableProps}
          {...dragHandleProps}
          style={draggableProps.style}
        >
          <div
            style={{
              ...style,
              ...getStyles(isDragging, isHovering)
            }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {children}
          </div>
        </div>
      )}
    </Draggable>
  );
};
