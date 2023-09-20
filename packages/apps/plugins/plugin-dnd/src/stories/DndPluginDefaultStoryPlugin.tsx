//
// Copyright 2023 DXOS.org
//

import { faker } from '@faker-js/faker';
import { DotsSixVertical } from '@phosphor-icons/react';
import { deepSignal } from 'deepsignal/react';
import React, { createContext, PropsWithChildren } from 'react';

import { randomString } from '@dxos/aurora';
import { useSortable, CSS } from '@dxos/aurora-grid';
import { mx } from '@dxos/aurora-theme';
import { PluginDefinition, Surface } from '@dxos/react-surface';

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

export const StoryItemDragOverlay = ({ data }: { data: { id: string } }) => {
  // (thure) Note that this is rendered as part of DndPlugin’s context, so it may not have access to other contexts.
  const item = state.items.find(({ id }) => id === data.id);
  return item ? <CompactStoryItem item={item} dragOverlay /> : null;
};

export const CompactStoryItem = ({
  item,
  rearranging,
}: {
  item: StoryItem;
  dragOverlay?: boolean;
  rearranging?: boolean;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: item.id,
    data: { entity: item },
  });
  return (
    <div
      className={mx('p-2 flex gap-2 items-center', rearranging && 'invisible')}
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

const state = deepSignal<DndPluginDefaultStoryContextValue>(defaultItems);

export type DndPluginDefaultStoryContextValue = { items: StoryItem[] };

export const DndPluginStoryPluginContext = createContext<DndPluginDefaultStoryContextValue>(state);

const DndPluginDefaultStoryPluginDefault = () => {
  return (
    <div role='none' className='flex p-4 gap-4'>
      <Surface role='dndpluginstory' />
    </div>
  );
};

export const DndPluginDefaultStoryPlugin = (): PluginDefinition<{ dndStory: DndPluginDefaultStoryContextValue }> => {
  return {
    meta: {
      id: 'example.com/plugin/dndStoryPluginA',
    },
    provides: {
      context: ({ children }: PropsWithChildren) => (
        <DndPluginStoryPluginContext.Provider value={state}>{children}</DndPluginStoryPluginContext.Provider>
      ),
      components: {
        default: DndPluginDefaultStoryPluginDefault,
      },
      component: (data: unknown, role?: string) => {
        switch (role) {
          case 'dragoverlay':
            return StoryItemDragOverlay;
          default:
            return null;
        }
      },
      dndStory: state,
    },
  };
};
