//
// Copyright 2023 DXOS.org
//

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { faker } from '@faker-js/faker';
import { DotsSixVertical } from '@phosphor-icons/react';
import React, { createContext, PropsWithChildren } from 'react';

import { randomString } from '@dxos/aurora';
import { mx } from '@dxos/aurora-theme';
import { createStore } from '@dxos/observable-object';
import { Surface } from '@dxos/react-surface';

export type StoryItem = { id: string; title: string; description: string; type: 'fruit' | 'vegetable' };

faker.seed(1111);

const defaultItems = {
  items: [
    {
      id: `storyItem:${randomString()}`,
      title: faker.commerce.product(),
      description: faker.commerce.productDescription(),
      type: 'fruit' as const,
    },
    {
      id: `storyItem:${randomString()}`,
      title: `${faker.commerce.productAdjective()} ${faker.commerce.productAdjective()} ${faker.commerce.productAdjective()} ${faker.commerce.productAdjective()} ${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
      description: faker.commerce.productDescription(),
      type: 'fruit' as const,
    },
    {
      id: `storyItem:${randomString()}`,
      title: `[Not accepted] ${faker.commerce.product()}`,
      description: faker.commerce.productDescription(),
      type: 'vegetable' as const,
    },
    {
      id: `storyItem:${randomString()}`,
      title: faker.commerce.product(),
      description: faker.commerce.productDescription(),
      type: 'fruit' as const,
    },
  ],
};

export const StoryItemDragOverlay = ({ data }: { data: string }) => {
  // (thure) Note that this is rendered as part of DndPlugin’s context, so it may not have access to other contexts.
  const item = store.items.find(({ id }) => id === data);
  return item ? <CompactStoryItem item={item} dragOverlay /> : null;
};

export const CompactStoryItem = ({
  item,
  dragging,
}: {
  item: StoryItem;
  dragOverlay?: boolean;
  dragging?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
    data: item,
  });
  return (
    <div
      className={mx('p-2 flex gap-2 items-center', dragging && 'invisible')}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      ref={setNodeRef}
    >
      <DotsSixVertical className='shrink-0' />
      {item.title}
    </div>
  );
};

const store = createStore<DndPluginDefaultStoryContextValue>(defaultItems);

export type DndPluginDefaultStoryContextValue = { items: StoryItem[] };

export const DndPluginStoryPluginContext = createContext<DndPluginDefaultStoryContextValue>(store);

const DndPluginDefaultStoryPluginDefault = () => {
  return (
    <div role='none' className='flex p-4 gap-4'>
      <Surface role='dndpluginstory' />
    </div>
  );
};

export const DndPluginDefaultStoryPlugin = () => {
  return {
    meta: {
      id: 'dxos:dndStoryPluginA',
    },
    provides: {
      context: ({ children }: PropsWithChildren) => (
        <DndPluginStoryPluginContext.Provider value={store}>{children}</DndPluginStoryPluginContext.Provider>
      ),
      components: {
        default: DndPluginDefaultStoryPluginDefault,
      },
      component: (daum: unknown, role?: string) => {
        switch (role) {
          case 'dragoverlay':
            return StoryItemDragOverlay;
          default:
            return null;
        }
      },
      dndStory: store,
    },
  };
};
