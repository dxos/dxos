//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { faker } from '@faker-js/faker';
import { DotsSixVertical } from '@phosphor-icons/react';
import React, { createContext, PropsWithChildren, useContext } from 'react';

import { ThemePlugin } from '@braneframe/plugin-theme';
import { randomString } from '@dxos/aurora';
import { createStore } from '@dxos/observable-object';
import { PluginContextProvider } from '@dxos/react-surface';

import { DndPlugin } from '../DndPlugin';

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
  const { items } = useContext(DndPluginStoryPluginAContext);
  return (
    <SortableContext items={items.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
      {items.map((item) => (
        <StoryItem key={item.id} {...item} />
      ))}
    </SortableContext>
  );
};

const DndPluginStoryPluginAContext = createContext<{ items: StoryItemProps[] }>({ items: [] });

const DndPluginStoryPluginA = () => {
  const store = createStore<{ items: StoryItemProps[] }>({
    items: [
      { id: `dndStoryPluginA:${randomString()}`, title: faker.commerce.product() },
      { id: `dndStoryPluginA:${randomString()}`, title: faker.commerce.product() },
      { id: `dndStoryPluginA:${randomString()}`, title: faker.commerce.product() },
      { id: `dndStoryPluginA:${randomString()}`, title: faker.commerce.product() },
    ],
  });
  return {
    meta: {
      id: 'dxos:dndStoryPluginA',
    },
    provides: {
      context: ({ children }: PropsWithChildren) => (
        <DndPluginStoryPluginAContext.Provider value={store}>{children}</DndPluginStoryPluginAContext.Provider>
      ),
      components: {
        default: DefaultDndPluginStoryPluginA,
      },
      dndStoryPluginA: store,
    },
  };
};

const DndSurfacesApp = () => <PluginContextProvider plugins={[ThemePlugin(), DndPlugin(), DndPluginStoryPluginA()]} />;

export default {
  component: DndSurfacesApp,
};

export const Default = {
  args: {},
};
