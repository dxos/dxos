//
// Copyright 2023 DXOS.org
//

import { deepSignal } from 'deepsignal/react';
import React, { useContext, useState } from 'react';

import { useMosaicDnd, useDragEnd, useDragOver, useDroppable } from '@dxos/aurora-grid';
import { mx } from '@dxos/aurora-theme';
import { PluginDefinition } from '@dxos/react-surface';

import { DndPluginStoryPluginContext, StoryItem } from './DndPluginDefaultStoryPlugin';

const state = deepSignal<{ items: StoryItem[] }>({ items: [] });

const droppableId = 'dndPluginDefaultStoryPluginB';

const DescribedStoryItem = ({ item, preview }: { item?: StoryItem; preview?: boolean }) => {
  return (
    <div role='group' className={mx('mlb-4 transition-opacity', preview && (item ? 'opacity-50' : 'opacity-0'))}>
      <h3 className='mbe-2'>{item?.title}</h3>
      <p>{item?.description}</p>
    </div>
  );
};

const DndPluginDefaultStoryPluginBDefault = () => {
  const { setNodeRef } = useDroppable({ id: droppableId });
  const { items: allItems } = useContext(DndPluginStoryPluginContext);
  const dnd = useMosaicDnd();
  const [preview, setPreview] = useState<StoryItem | null>(null);
  const [iter, setIter] = useState([]);
  useDragEnd(
    ({ active, over }) => {
      if (over?.id === droppableId) {
        const inStore = state.items.findIndex(({ id }) => id === active.id) >= 0;
        if (!inStore) {
          const item = allItems.find(({ id }) => id === active.id);
          if (item && item.type === 'fruit') {
            dnd.overlayDropAnimation = 'into';
            item && state.items.splice(state.items.length, 0, item);
            setIter([]);
          } else {
            dnd.overlayDropAnimation = 'away';
          }
        }
      }
      setPreview(null);
    },
    [iter],
  );

  useDragOver(({ active, over }) => {
    if (over?.id === droppableId) {
      const inStore = state.items.findIndex(({ id }) => id === active.id) >= 0;
      if (!inStore) {
        const item = allItems.find(({ id }) => id === active.id);
        if (item && item.type === 'fruit') {
          return setPreview(item);
        }
      }
    }
    setPreview(null);
  }, []);

  return (
    <div
      className={mx('flex-1 p-2 min-is-[300px] rounded-xl border-dashed border border-neutral-500/50 pli-4')}
      ref={setNodeRef}
    >
      {state.items.map((item) => {
        return <DescribedStoryItem key={item.id} item={item} />;
      })}
      {<DescribedStoryItem item={preview ?? undefined} preview />}
    </div>
  );
};

export const DndPluginDefaultStoryPluginB = (): PluginDefinition => {
  return {
    meta: {
      id: 'example.com/plugin/dndPluginDefaultStoryPluginB',
    },
    provides: {
      component: (data, role) => {
        if (role === 'dndpluginstory') {
          return DndPluginDefaultStoryPluginBDefault;
        } else {
          return null;
        }
      },
    },
  };
};
