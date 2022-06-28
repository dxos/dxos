//
// Copyright 2022 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { CSSProperties, ReactNode } from 'react';

export interface DraggableContainerProps {
  id: string
  children: ReactNode
  style?: CSSProperties
  placeholderStyles?: CSSProperties
}

export const DraggableContainer = ({
  id,
  children,
  style: customStyles = {},
  placeholderStyles = {}
}: DraggableContainerProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id });

  // TODO(kaplanski): Better way to handle styles? (i.e., Emotion, etc.).
  return (
    <div
      ref={setNodeRef}
      style={{
        cursor: 'pointer',
        ...customStyles,
        ...(isDragging ? placeholderStyles : {}),
        transform: CSS.Transform.toString(transform),
        transition
      }}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
};
