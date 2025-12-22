//
// Copyright 2022 DXOS.org
//

import { DndContext, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useArrowNavigationGroup } from '@fluentui/react-tabster';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type ReactNode, useState } from 'react';

import {
  getSize,
  ghostHover,
  ghostSelected,
  ghostSelectedTrackingInterFromNormal,
  mx,
  surfaceShadow,
} from '@dxos/ui-theme';

import { withTheme } from '../../testing';
import { Icon } from '../Icon';

import { List, ListItem, type ListScopedProps } from './List';

const meta = {
  title: 'ui/react-ui-core/List',
  component: List,
  decorators: [withTheme],
} satisfies Meta<typeof List>;

export default meta;

type Story = StoryObj<typeof meta>;

const UniformListItem = ({ id, text }: { id: string; text: string }) => {
  const { attributes, listeners, setNodeRef, transform } = useSortable({ id });
  return (
    <ListItem.Root
      id={id}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform) }}
    >
      <ListItem.Endcap>
        <Icon icon='ph--dots-six-vertical--regular' classNames={mx(getSize(5), 'mbs-2.5')} />
      </ListItem.Endcap>
      <ListItem.Heading classNames='grow pbs-2'>{text}</ListItem.Heading>
      <ListItem.Endcap>
        <Icon icon='ph--push-pin--regular' classNames={mx(getSize(5), 'mbs-2.5')} />
      </ListItem.Endcap>
    </ListItem.Root>
  );
};

export const UniformSizeDraggable: Story = {
  render: ({ ...args }) => {
    const [items, setItems] = useState(
      [...Array(12)].map((_, index) => ({
        id: `listItem-${index}`,
        text: `List item ${index + 1}`,
      })),
    );

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;
      if (active.id !== over?.id) {
        setItems((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over?.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    };
    return (
      <DndContext onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
          <List {...args} itemSizes='one'>
            {items.map((item) => (
              <UniformListItem key={item.id} {...item} />
            ))}
          </List>
        </SortableContext>
      </DndContext>
    );
  },
  args: {},
};

const ManySizesDraggableListItem = ({
  id,
  text,
  className,
  dragging,
  __listScope,
}: ListScopedProps<{ id: string; text: ReactNode; className?: string; dragging?: boolean }>) => {
  const { attributes, listeners, setNodeRef, transform } = useSortable({ id });
  return (
    <ListItem.Root
      id={id}
      classNames={[dragging && 'relative z-10', className]}
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Translate.toString(transform) }}
    >
      <ListItem.Endcap>
        <Icon icon='ph--dots-six-vertical--regular' classNames={mx(getSize(5), 'mbs-2.5')} />
      </ListItem.Endcap>
      <ListItem.Heading classNames='grow pbs-2' asChild>
        {text}
      </ListItem.Heading>
      <ListItem.Endcap>
        <Icon icon='ph--push-pin--regular' classNames={mx(getSize(5), 'mbs-2.5')} />
      </ListItem.Endcap>
    </ListItem.Root>
  );
};

export const ManySizesDraggable: Story = {
  render: ({ ...args }) => {
    const [items, setItems] = useState(
      [...Array(12)].map((_, index) => ({
        id: `listItem-${index}`,
        text: (
          <p
            className={mx(
              index % 3 === 0 ? 'bs-20' : index % 2 === 0 ? 'bs-12' : 'bs-8',
              surfaceShadow({ elevation: 'positioned' }),
              'mbe-2 p-2 bg-white dark:bg-neutral-800 rounded',
            )}
          >{`List item ${index + 1}`}</p>
        ),
      })),
    );

    const [activeId, setActiveId] = useState<string | null>(null);

    const handleDragStart = ({ active: { id } }: DragStartEvent) => setActiveId(id.toString());

    const handleDragEnd = (event: DragEndEvent) => {
      const { active, over } = event;

      if (active.id !== over?.id) {
        setItems((items) => {
          const oldIndex = items.findIndex((item) => item.id === active.id);
          const newIndex = items.findIndex((item) => item.id === over?.id);
          return arrayMove(items, oldIndex, newIndex);
        });
      }
    };

    return (
      <DndContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
        <SortableContext items={items.map(({ id }) => id)} strategy={verticalListSortingStrategy}>
          <List {...args}>
            {items.map(({ id, text }) => (
              <ManySizesDraggableListItem key={id} {...{ id, text }} dragging={activeId === id} />
            ))}
          </List>
        </SortableContext>
      </DndContext>
    );
  },
  args: {},
};

export const Collapsible: Story = {
  render: ({ ...args }) => {
    const [items, _setItems] = useState(
      [...Array(12)].map((_, index) => ({
        id: `listItem-${index}`,
        text: `List item ${index + 1}`,
        body: `Collapsible content for item ${index + 1}`,
      })),
    );

    return (
      <List {...args}>
        {items.map(({ id, text, body }, index) => (
          <ListItem.Root key={id} id={id} collapsible={index !== 2} defaultOpen={index % 2 === 0}>
            <div role='none' className='grow flex'>
              {index !== 2 ? <ListItem.OpenTrigger /> : <ListItem.MockOpenTrigger />}
              <ListItem.Heading classNames='grow pbs-2'>{text}</ListItem.Heading>
              <ListItem.Endcap>
                <Icon icon='ph--push-pin--regular' classNames={mx(getSize(5), 'mbs-2.5')} />
              </ListItem.Endcap>
            </div>
            {index !== 2 && <ListItem.CollapsibleContent>{body}</ListItem.CollapsibleContent>}
          </ListItem.Root>
        ))}
      </List>
    );
  },
  args: {
    variant: 'unordered',
  },
};

export const SelectableListbox: Story = {
  render: () => {
    const [selectedId, setSelectedId] = useState<string>();
    const arrowNavigationAttrs = useArrowNavigationGroup({ axis: 'vertical' });
    const [items, _setItems] = useState(
      [...Array(12)].map((_, index) => ({
        id: `listItem-${index}`,
        text: `List item ${index + 1}`,
      })),
    );

    const handleKeyUp = (event: any, id: string) => {
      switch (event.key) {
        case ' ':
        case 'Enter': {
          setSelectedId(id);
        }
      }
    };

    return (
      <List selectable {...arrowNavigationAttrs}>
        {items.map(({ id, text }) => (
          <ListItem.Root
            key={id}
            tabIndex={0}
            selected={selectedId === id}
            classNames={mx(ghostHover, ghostSelected, ghostSelectedTrackingInterFromNormal)}
            onClick={() => setSelectedId(id)}
            onKeyUp={(event) => handleKeyUp(event, id)}
          >
            <ListItem.Heading classNames='flex pli-1 items-center grow truncate'>{text}</ListItem.Heading>
          </ListItem.Root>
        ))}
      </List>
    );
  },
};
