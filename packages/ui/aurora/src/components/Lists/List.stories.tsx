//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { Play, PushPin } from '@phosphor-icons/react';
import React, { FC, ReactNode, useState } from 'react';

import { getSize, mx, surfaceElevation } from '@dxos/aurora-theme';

import { List, ListItem, arrayMove, DragEndEvent, ListProps, useListContext, ListScopedProps } from './List';

export default {
  component: List as FC<ListProps>,
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
      <List {...args} itemSizes='one' onDragEnd={handleDragEnd} listItemIds={items.map(({ id }) => id)}>
        {items.map(({ id, text }) => (
          <ListItem.Root key={id} id={id}>
            {args.variant === 'ordered-draggable' && <ListItem.DragHandle />}
            <ListItem.Endcap>
              <Play className={mx(getSize(5), 'mbs-2.5')} />
            </ListItem.Endcap>
            <ListItem.Heading classNames='grow pbs-2'>{text}</ListItem.Heading>
            <ListItem.Endcap>
              <PushPin className={mx(getSize(5), 'mbs-2.5')} />
            </ListItem.Endcap>
          </ListItem.Root>
        ))}
      </List>
    );
  },
  args: {
    variant: 'ordered-draggable',
  },
};

const ManySizesDraggableListItem = ({
  id,
  text,
  className,
  __listScope,
}: ListScopedProps<{ id: string; text: ReactNode; className?: string }>) => {
  const { draggingId } = useListContext('ManySizesDraggableListItem', __listScope);
  return (
    <ListItem.Root key={id} id={id} classNames={[id === draggingId && 'relative z-10', className]}>
      <ListItem.DragHandle />
      <ListItem.Endcap>
        <Play className={mx(getSize(5), 'mbs-2.5')} />
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
      <List {...args} onDragEnd={handleDragEnd} listItemIds={items.map(({ id }) => id)}>
        {items.map(({ id, text }) => (
          <ManySizesDraggableListItem key={id} {...{ id, text }} />
        ))}
      </List>
    );
  },
  args: {
    variant: 'ordered-draggable',
  },
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
