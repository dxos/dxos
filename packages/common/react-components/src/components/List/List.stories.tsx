//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { arrayMove } from '@dnd-kit/sortable';
import { Play, PushPin } from 'phosphor-react';
import React, { ComponentPropsWithoutRef, KeyboardEvent, useState } from 'react';

import { useId } from '../../hooks';
import { getSize } from '../../styles';
import { mx } from '../../util';
import { Input } from '../Input';
import { List, ListItem } from './List';

type DragEndEvent = Parameters<Exclude<ComponentPropsWithoutRef<typeof List>['onDragEnd'], undefined>>[0];

export default {
  component: List
};

export const Default = {
  render: ({ ...args }) => {
    const [items, setItems] = useState(
      [...Array(12)].map((_, index) => ({
        id: `listItem-${index}`,
        text: `List item ${index + 1}`
      }))
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
      <List {...args} labelId='excluded' onDragEnd={handleDragEnd} listItemIds={items.map(({ id }) => id)}>
        {items.map(({ id, text }) => (
          <ListItem
            key={id}
            id={id}
            before={<Play className={mx(getSize(5), 'mbs-2.5')} />}
            after={<PushPin className={mx(getSize(5), 'mbs-2.5')} />}
          >
            <p className='mbs-2'>{text}</p>
          </ListItem>
        ))}
      </List>
    );
  },
  args: {
    selectable: true,
    variant: 'ordered-draggable'
  }
};

export const TaskListItems = {
  render: ({ ...args }) => {
    const ListInstance = () => {
      const listId = useId('L');
      const titleId = useId('listTitle');
      const [items, setItems] = useState(
        [...Array(6)].map((_, index) => ({
          id: `${listId}--listItem-${index}`,
          text: `${listId} item ${index + 1}`
        }))
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

      const onKeyDown = (event: KeyboardEvent<Element>) => {
        const siblings = Array.from(
          document.querySelectorAll<HTMLInputElement>(
            `ol[aria-labelledby="${titleId}"] input[data-focus-series="list"]`
          )
        );
        const targetIndex = siblings.findIndex((sibling) => sibling === event.target);
        console.log(targetIndex, siblings);
        switch (event.key) {
          case 'Enter':
          case 'PageDown': {
            if (targetIndex < siblings.length - 1) {
              event.preventDefault();
              siblings[targetIndex + 1].focus();
            }
            break;
          }
          case 'PageUp': {
            if (targetIndex > 0) {
              event.preventDefault();
              siblings[targetIndex - 1].focus();
            }
            break;
          }
        }
      };

      return (
        <>
          <h2 id={titleId}>{listId}</h2>
          <List {...args} labelId={titleId} onDragEnd={handleDragEnd} listItemIds={items.map(({ id }) => id)}>
            {items.map(({ id, text }) => (
              <ListItem
                key={id}
                id={id}
                before={<Play className={mx(getSize(5), 'mbs-2.5')} />}
                after={<PushPin className={mx(getSize(5), 'mbs-2.5')} />}
              >
                <Input
                  variant='subdued'
                  label={id}
                  defaultValue={text}
                  slots={{
                    label: { className: 'sr-only' },
                    root: { className: 'm-0' },
                    input: {
                      className: 'p-1 mbs-1',
                      'data-focus-series': 'list',
                      onKeyDown
                    } as ComponentPropsWithoutRef<'input'>
                  }}
                />
              </ListItem>
            ))}
          </List>
        </>
      );
    };
    return (
      <>
        <ListInstance />
        <ListInstance />
      </>
    );
  },
  args: {
    selectable: true,
    variant: 'ordered-draggable'
  }
};
