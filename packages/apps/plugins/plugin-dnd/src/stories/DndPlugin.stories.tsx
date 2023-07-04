//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { UniqueIdentifier, useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { faker } from '@faker-js/faker';
import { DotsSixVertical } from '@phosphor-icons/react';
import React, { createContext, PropsWithChildren, useContext, useState } from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { randomString } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { createStore } from '@dxos/observable-object';
import { PluginContextProvider, Surface } from '@dxos/react-surface';
import { arrayMove } from '@dxos/util';

import { DndPlugin, useDragEnd, useDragStart } from '../DndPlugin';

type StoryItemProps = { id: string; title: string };

faker.seed(1111);

const defaultItems = {
  items: [
    { id: `storyItem:${randomString()}`, title: faker.commerce.product() },
    { id: `storyItem:${randomString()}`, title: faker.commerce.product() },
    { id: `storyItem:${randomString()}`, title: faker.commerce.product() },
    { id: `storyItem:${randomString()}`, title: faker.commerce.product() },
  ],
};

const StoryItem = ({ id, title, dragging }: StoryItemProps & { dragOverlay?: boolean; dragging?: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
  });
  return (
    <div
      className={mx('p-2 flex gap-2 items-center', dragging && 'invisible')}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      ref={setNodeRef}
    >
      <DotsSixVertical />
      {title}
    </div>
  );
};

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

const StoryItemDragOverlay = ({ data }: { data: string }) => {
  const store = useContext(DndPluginStoryPluginContext);
  const item = store.items.find(({ id }) => id === data);
  return item ? <StoryItem {...item} dragOverlay /> : null;
};

const DndPluginStoryPluginA = () => {
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

const DefaultDndPluginStoryPluginB = () => {
  const { setNodeRef, isOver } = useDroppable({ id: 'dndStoryPluginB' });
  return (
    <div
      className={mx(
        'p-2 min-is-[300px] rounded-xl border-dashed border border-neutral-500/50',
        isOver && 'bg-neutral-500/20',
      )}
      ref={setNodeRef}
    ></div>
  );
};

const DndPluginStoryPluginB = () => {
  return {
    meta: {
      id: 'dxos:dndStoryPluginB',
    },
    provides: {
      component: (datum: unknown, role?: string) => {
        if (role === 'dndpluginstory') {
          return DefaultDndPluginStoryPluginB;
        } else {
          return null;
        }
      },
    },
  };
};

const DndPluginStoryPluginContext = createContext<{ items: StoryItemProps[] }>(defaultItems);

const DefaultDndPluginStoryPlugin = () => {
  return (
    <div role='none' className='flex p-4 gap-4'>
      <Surface role='dndpluginstory' />
    </div>
  );
};

const DndPluginStoryPlugin = () => {
  const store = createStore<{ items: StoryItemProps[] }>(defaultItems);
  return {
    meta: {
      id: 'dxos:dndStoryPluginA',
    },
    provides: {
      context: ({ children }: PropsWithChildren) => (
        <DndPluginStoryPluginContext.Provider value={store}>{children}</DndPluginStoryPluginContext.Provider>
      ),
      components: {
        default: DefaultDndPluginStoryPlugin,
      },
      dndStory: store,
    },
  };
};

const DndSurfacesApp = () => (
  <PluginContextProvider
    plugins={[ThemePlugin(), DndPlugin(), DndPluginStoryPlugin(), DndPluginStoryPluginA(), DndPluginStoryPluginB()]}
  />
);

export default {
  component: DndSurfacesApp,
};

export const Default = {
  args: {},
};
