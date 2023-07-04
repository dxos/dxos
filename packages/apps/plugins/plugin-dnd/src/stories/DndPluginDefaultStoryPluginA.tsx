//
// Copyright 2023 DXOS.org
//

import { UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { useContext, useState } from 'react';

import { arrayMove } from '@dxos/util';

import { useDragEnd, useDragStart } from '../DndPlugin';
import { DndPluginStoryPluginContext, StoryItem, StoryItemDragOverlay } from './DndPluginDefaultStoryPlugin';

const DefaultDndPluginStoryPluginA = () => {
  const [_, setIter] = useState([]);
  const store = useContext(DndPluginStoryPluginContext);
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  useDragStart(({ active: { id } }) => {
    setActiveId(id);
  }, []);
  useDragEnd(({ active, over }) => {
    if (active.id !== over?.id) {
      const oldIndex = store.items.findIndex((item) => item.id === active.id);
      const newIndex = store.items.findIndex((item) => item.id === over?.id);
      arrayMove(store.items, oldIndex, newIndex);
      setIter([]);
    }
    setActiveId(null);
  }, []);

  return (
    <div className='p-2 min-is-[300px] rounded-xl border-dashed border border-neutral-500/50'>
      <SortableContext items={store.items.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
        {store.items.map((item) => (
          <StoryItem key={item.id} {...item} dragging={item.id === activeId} />
        ))}
      </SortableContext>
    </div>
  );
};

export const DndPluginDefaultStoryPluginA = () => {
  return {
    meta: {
      id: 'dxos:dndStoryPluginA',
    },
    provides: {
      component: (datum: unknown, role?: string) => {
        switch (role) {
          case 'dndpluginstory':
            return DefaultDndPluginStoryPluginA;
          case 'dragoverlay':
            return StoryItemDragOverlay;
          default:
            return null;
        }
      },
    },
  };
};
