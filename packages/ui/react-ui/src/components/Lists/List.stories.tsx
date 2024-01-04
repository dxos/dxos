//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { DndContext, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DotsSixVertical, PushPin } from '@phosphor-icons/react';
import React, { type FC, type ReactNode, useState } from 'react';

import { getSize, mx, surfaceElevation } from '@dxos/react-ui-theme';

import { List, ListItem, type ListProps, type ListScopedProps } from './List';
import { withTheme } from '../../testing';

export default {
  title: 'react-ui/List',
  component: List as FC<ListProps>,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false } },
};

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
        <DotsSixVertical className={mx(getSize(5), 'mbs-2.5')} />
      </ListItem.Endcap>
      <ListItem.Heading classNames='grow pbs-2'>{text}</ListItem.Heading>
      <ListItem.Endcap>
        <PushPin className={mx(getSize(5), 'mbs-2.5')} />
      </ListItem.Endcap>
    </ListItem.Root>
  );
};

export const UniformSizeDraggable = {
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
        <DotsSixVertical className={mx(getSize(5), 'mbs-2.5')} />
      </ListItem.Endcap>
      <ListItem.Heading classNames='grow pbs-2' asChild>
        {text}
      </ListItem.Heading>
      <ListItem.Endcap>
        <PushPin className={mx(getSize(5), 'mbs-2.5')} />
      </ListItem.Endcap>
    </ListItem.Root>
  );
};
export const ManySizesDraggable = {
  render: ({ ...args }) => {
    const [items, setItems] = useState(
      [...Array(12)].map((_, index) => ({
        id: `listItem-${index}`,
        text: (
          <p
            className={mx(
              index % 3 === 0 ? 'bs-20' : index % 2 === 0 ? 'bs-12' : 'bs-8',
              surfaceElevation({ elevation: 'group' }),
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

export const Collapsible = {
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
                <PushPin className={mx(getSize(5), 'mbs-2.5')} />
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
    toggleOpenLabel: 'Open/close storybook list item',
  },
};
