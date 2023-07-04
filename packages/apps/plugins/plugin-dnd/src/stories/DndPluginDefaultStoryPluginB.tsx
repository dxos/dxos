//
// Copyright 2023 DXOS.org
//

import { useDroppable } from '@dnd-kit/core';
import React, { useContext, useState } from 'react';

import { mx } from '@dxos/aurora-theme';
import { createStore } from '@dxos/observable-object';

import { useDragEnd } from '../DndPlugin';
import { DndPluginStoryPluginContext, StoryItemProps } from './DndPluginDefaultStoryPlugin';

const store = createStore<{ items: StoryItemProps[] }>({ items: [] });

const droppableId = 'dndPluginDefaultStoryPluginB';

const DndPluginDefaultStoryPluginBDefault = () => {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId });
  const { items: allItems } = useContext(DndPluginStoryPluginContext);
  const [iter, setIter] = useState([]);
  useDragEnd(
    ({ active, over }) => {
      if (over?.id === droppableId) {
        const inStore = store.items.findIndex(({ id }) => id === active.id) >= 0;
        if (!inStore) {
          const item = allItems.find(({ id }) => id === active.id);
          item && store.items.splice(store.items.length, 0, item);
          setIter([]);
        }
      }
    },
    [iter],
  );
  return (
    <div
      className={mx(
        'flex-1 p-2 min-is-[300px] rounded-xl border-dashed border border-neutral-500/50',
        isOver && 'bg-neutral-500/20',
      )}
      ref={setNodeRef}
    >
      {store.items.map((item) => {
        return (
          <div key={item.id} role='group'>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </div>
        );
      })}
    </div>
  );
};

export const DndPluginDefaultStoryPluginB = () => {
  return {
    meta: {
      id: 'dxos:dndPluginDefaultStoryPluginB',
    },
    provides: {
      component: (datum: unknown, role?: string) => {
        if (role === 'dndpluginstory') {
          return DndPluginDefaultStoryPluginBDefault;
        } else {
          return null;
        }
      },
    },
  };
};
