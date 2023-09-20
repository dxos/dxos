//
// Copyright 2023 DXOS.org
//

import { DragCancelEvent, DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import { DependencyList, useContext, useEffect } from 'react';

import { Handler } from '../../types';
import { MosaicDndContext } from '../DndContext';

export const useDragOver = (callback: Handler<DragOverEvent>, dependencies: DependencyList) => {
  const { dragOverSubscriptions } = useContext(MosaicDndContext);
  useEffect(() => {
    dragOverSubscriptions.push(callback);
    return () => {
      const index = dragOverSubscriptions.indexOf(callback);
      dragOverSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

export const useDragStart = (callback: Handler<DragStartEvent>, dependencies: DependencyList) => {
  const { dragStartSubscriptions } = useContext(MosaicDndContext);
  useEffect(() => {
    dragStartSubscriptions.push(callback);
    return () => {
      const index = dragStartSubscriptions.indexOf(callback);
      dragStartSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

export const useDragEnd = (callback: Handler<DragEndEvent>, dependencies: DependencyList) => {
  const { dragEndSubscriptions } = useContext(MosaicDndContext);
  useEffect(() => {
    dragEndSubscriptions.push(callback);
    return () => {
      const index = dragEndSubscriptions.indexOf(callback);
      dragEndSubscriptions.splice(index, 1);
    };
  }, dependencies);
};

export const useDragCancel = (callback: Handler<DragCancelEvent>, dependencies: DependencyList) => {
  const { dragCancelSubscriptions } = useContext(MosaicDndContext);
  useEffect(() => {
    dragCancelSubscriptions.push(callback);
    return () => {
      const index = dragCancelSubscriptions.indexOf(callback);
      dragCancelSubscriptions.splice(index, 1);
    };
  }, dependencies);
};
