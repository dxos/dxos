//
// Copyright 2023 DXOS.org
//

import { DndContext, DragEndEvent, MouseSensor, pointerWithin, useSensor } from '@dnd-kit/core';
import React, { ReactNode } from 'react';

export type ContainerProps = {
  children: ReactNode;
  onDragEnd: (event: DragEndEvent) => void;
};

export const Container = ({ children, onDragEnd }: ContainerProps) => {
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10 // Move 10px before activating.
    }
  });

  return (
    <DndContext sensors={[mouseSensor]} collisionDetection={pointerWithin} onDragEnd={onDragEnd}>
      {children}
    </DndContext>
  );
};
