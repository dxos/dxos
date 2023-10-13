//
// Copyright 2023 DXOS.org
//

import { type DragCancelEvent, type DragEndEvent, type DragOverEvent, type DragStartEvent } from '@dnd-kit/core';
import { type DependencyList, useContext, useEffect } from 'react';

import { type EventHandler, MosaicDndContext } from '../../dnd';

export const useDragOver = (callback: EventHandler<DragOverEvent>, dependencies: DependencyList) => {
  const { dragOverSubscriptions } = useContext(MosaicDndContext);
  useEffect(() => {
    dragOverSubscriptions.push(callback);
    return () => {
      const index = dragOverSubscriptions.indexOf(callback);
      dragOverSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

export const useDragStart = (callback: EventHandler<DragStartEvent>, dependencies: DependencyList) => {
  const { dragStartSubscriptions } = useContext(MosaicDndContext);
  useEffect(() => {
    dragStartSubscriptions.push(callback);
    return () => {
      const index = dragStartSubscriptions.indexOf(callback);
      dragStartSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

export const useDragEnd = (callback: EventHandler<DragEndEvent>, dependencies: DependencyList) => {
  const { dragEndSubscriptions } = useContext(MosaicDndContext);
  useEffect(() => {
    dragEndSubscriptions.push(callback);
    return () => {
      const index = dragEndSubscriptions.indexOf(callback);
      dragEndSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

export const useDragCancel = (callback: EventHandler<DragCancelEvent>, dependencies: DependencyList) => {
  const { dragCancelSubscriptions } = useContext(MosaicDndContext);
  useEffect(() => {
    dragCancelSubscriptions.push(callback);
    return () => {
      const index = dragCancelSubscriptions.indexOf(callback);
      dragCancelSubscriptions.splice(index, 1);
    };
  }, dependencies);
};
