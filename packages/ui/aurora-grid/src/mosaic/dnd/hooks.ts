//
// Copyright 2023 DXOS.org
//

import { DragCancelEvent, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { DependencyList, useContext, useEffect } from 'react';

import { DndContext } from './DndContext';
import { Handler } from '../types';

export const useDragOver = (callback: Handler<DragStartEvent>, dependencies: DependencyList) => {
  const { dragOverSubscriptions } = useContext(DndContext);
  useEffect(() => {
    dragOverSubscriptions.push(callback);
    return () => {
      const index = dragOverSubscriptions.indexOf(callback);
      dragOverSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

export const useDragStart = (callback: Handler<DragStartEvent>, dependencies: DependencyList) => {
  const { dragStartSubscriptions } = useContext(DndContext);
  useEffect(() => {
    dragStartSubscriptions.push(callback);
    return () => {
      const index = dragStartSubscriptions.indexOf(callback);
      dragStartSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

export const useDragEnd = (callback: Handler<DragEndEvent>, dependencies: DependencyList) => {
  const { dragEndSubscriptions } = useContext(DndContext);
  useEffect(() => {
    console.log('[use drag end]', 'sub');
    dragEndSubscriptions.push(callback);
    return () => {
      const index = dragEndSubscriptions.indexOf(callback);
      console.log('[use drag end]', 'un-sub', index >= 0);
      dragEndSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

export const useDragCancel = (callback: Handler<DragCancelEvent>, dependencies: DependencyList) => {
  const { dragCancelSubscriptions } = useContext(DndContext);
  useEffect(() => {
    dragCancelSubscriptions.push(callback);
    return () => {
      const index = dragCancelSubscriptions.indexOf(callback);
      dragCancelSubscriptions.splice(index, 1);
    };
  }, dependencies);
};
