//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { faker } from '@faker-js/faker';
import { DotsSixVertical } from '@phosphor-icons/react';
import React, { createContext, PropsWithChildren, useContext, useState } from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { randomString } from '@dxos/aurora';
import { createStore } from '@dxos/observable-object';
import { PluginContextProvider, Surface } from '@dxos/react-surface';
import { arrayMove } from '@dxos/util';

import { DndPlugin, useDragEnd } from '../DndPlugin';

type StoryItemProps = { id: string; title: string };

faker.seed(1111);

const StoryItem = (props: StoryItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.id,
  });
  return (
    <div
      className='p-2 flex gap-2 items-center'
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      ref={setNodeRef}
    >
      <DotsSixVertical />
      {props.title}
    </div>
  );
};

const DefaultDndPluginStoryPluginA = () => {
  const [_, setIter] = useState([]);
  const store = useContext(DndPluginStoryPluginContext);
  useDragEnd(({ active, over }) => {
    if (active.id !== over?.id) {
      const oldIndex = store.items.findIndex((item) => item.id === active.id);
      const newIndex = store.items.findIndex((item) => item.id === over?.id);
      arrayMove(store.items, oldIndex, newIndex);
      setIter([]);
    }
  }, []);

  return (
    <div className=''>
      <SortableContext items={store.items.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
        {store.items.map((item) => (
          <StoryItem key={item.id} {...item} />
        ))}
      </SortableContext>
    </div>
  );
};

const DndPluginStoryPluginContext = createContext<{ items: StoryItemProps[] }>({ items: [] });

const DndPluginStoryPluginA = () => {
  return {
    meta: {
      id: 'dxos:dndStoryPluginA',
    },
    provides: {
      component: (datum: unknown, role?: string) => {
        if (role === 'dndpluginstory') {
          return DefaultDndPluginStoryPluginA;
        } else {
          return null;
        }
      },
    },
  };
};

const DefaultDndPluginStoryPlugin = () => {
  return (
    <div role='none' className='flex'>
      <Surface role='dndpluginstory' />
    </div>
  );
};

const DndPluginStoryPlugin = () => {
  const store = createStore<{ items: StoryItemProps[] }>({
    items: [
      { id: `storyItem:${randomString()}`, title: faker.commerce.product() },
      { id: `storyItem:${randomString()}`, title: faker.commerce.product() },
      { id: `storyItem:${randomString()}`, title: faker.commerce.product() },
      { id: `storyItem:${randomString()}`, title: faker.commerce.product() },
    ],
  });
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
  <PluginContextProvider plugins={[ThemePlugin(), DndPlugin(), DndPluginStoryPlugin(), DndPluginStoryPluginA()]} />
);

export default {
  component: DndSurfacesApp,
};

export const Default = {
  args: {},
};
