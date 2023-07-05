//
// Copyright 2023 DXOS.org
//

import { UniqueIdentifier } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import React, { useContext, useState } from 'react';

import { arrayMove } from '@dxos/util';

import { useDnd, useDragEnd, useDragOver, useDragStart } from '../DndPlugin';
import { CompactStoryItem, DndPluginStoryPluginContext } from './DndPluginDefaultStoryPlugin';

const DefaultDndPluginStoryPluginA = () => {
  const [_, setIter] = useState([]);
  const store = useContext(DndPluginStoryPluginContext);
  const dnd = useDnd();
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  useDragStart(({ active: { id } }) => {
    setActiveId(id);
  }, []);
  useDragEnd(
    ({ active, over }) => {
      if (over?.id && active.id !== over.id && store.items.findIndex(({ id }) => over.id === id) >= 0) {
        dnd.overlayDropAnimation = 'around';
        const oldIndex = store.items.findIndex((item) => item.id === active.id);
        const newIndex = store.items.findIndex((item) => item.id === over?.id);
        arrayMove(store.items, oldIndex, newIndex);
        setIter([]);
      }
      if (!over) {
        dnd.overlayDropAnimation = 'away';
      }
      setActiveId(null);
    },
    [store.items],
  );
  useDragOver(
    ({ active, over }) => {
      if (over && store.items.findIndex(({ id }) => over.id === id) >= 0) {
        setActiveId(active.id);
      } else {
        setActiveId(null);
      }
    },
    [store.items],
  );

  return (
    <div className='p-2 is-72 rounded-xl border-dashed border border-neutral-500/50'>
      <SortableContext items={store.items.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
        {store.items.map((item) => (
          <CompactStoryItem key={item.id} item={item} rearranging={item.id === activeId} />
        ))}
      </SortableContext>
    </div>
  );
};

export const DndPluginDefaultStoryPluginA = () => {
  return {
    meta: {
      id: 'dxos:dndPluginDefaultStoryPluginA',
    },
    provides: {
      component: (datum: unknown, role?: string) => {
        switch (role) {
          case 'dndpluginstory':
            return DefaultDndPluginStoryPluginA;
          default:
            return null;
        }
      },
    },
  };
};
