//
// Copyright 2023 DXOS.org
//

import { Circle, Plus } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { getSize, List, ListItem, Button, Input, ListItemEndcap, mx } from '@dxos/react-components';

// TODO(burdon): Reconcile with Item.
export type Object = { id: string };

export type EditableObjectListSlots = {
  root?: {
    className?: string;
  };
  item?: {
    className?: string;
  };
  selected?: {
    className?: string;
  };
};

export type EditableObjectListProps<T extends Object> = {
  objects: T[];
  selected?: string;
  getTitle: (object: T) => string;
  Icon: FC<any>;
  Action?: FC<any>;
  slots?: EditableObjectListSlots;
  onSelect?: (id: string) => void;
  onAction?: (id: string) => void;
  onUpdate?: (id: string, text: string) => Promise<void>;
  onCreate?: () => Promise<string | undefined>;
};

// TODO(burdon): Replace with react-components list.
// TODO(burdon): onCreate, onUpdate title.
// TODO(burdon): Focus on create.
// TODO(burdon): Delete.
export const EditableObjectList = <T extends Object>({
  objects,
  selected,
  getTitle,
  Icon,
  Action,
  slots = {},
  onSelect,
  onAction,
  onUpdate,
  onCreate
}: EditableObjectListProps<T>) => {
  const handleCreate = async () => {
    if (onCreate) {
      const objectId = await onCreate();
      if (objectId) {
        onSelect?.(objectId);
      }
    }
  };

  const ActionIcon = Action ?? Circle;

  return (
    <div role='none' className={mx('is-full', slots.root?.className)}>
      <List labelId='objects'>
        {objects.map((object) => {
          const isSelected = object.id === selected;
          return (
            <ListItem
              id={object.id}
              key={object.id}
              slots={{
                root: {
                  className: selected === object.id ? slots?.selected?.className : undefined
                },
                mainContent: { className: 'flex w-full px-3 items-center' }
              }}
            >
              <ListItemEndcap asChild>
                {/* TODO(burdon): Why is div required? */}
                <div>
                  <Button
                    variant='ghost'
                    onClick={() => onSelect?.(object.id)}
                    className={mx(isSelected ? 'text-selection-text' : '')}
                  >
                    <Icon className={getSize(6)} />
                  </Button>
                </div>
              </ListItemEndcap>

              <Input
                variant='subdued'
                label='Title'
                labelVisuallyHidden
                placeholder='Title'
                slots={{
                  root: { className: 'grow pl-1' },
                  input: { autoFocus: !getTitle(object)?.length }
                }}
                value={getTitle(object) ?? ''}
                onChange={({ target: { value } }) => onUpdate?.(object.id, value)}
              />

              {onAction && (
                <ListItemEndcap asChild>
                  <div className='flex justify-center items-center'>
                    <Button variant='ghost' className='p-0' onClick={() => onAction?.(object.id)}>
                      <ActionIcon className={getSize(6)} />
                    </Button>
                  </div>
                </ListItemEndcap>
              )}
            </ListItem>
          );
        })}
      </List>

      {/* TODO(burdon): Not aligned with list. */}
      {onCreate && (
        <div className='flex items-center pl-3'>
          <ListItemEndcap>
            <Button variant='ghost' onClick={handleCreate}>
              <Plus className={getSize(6)} />
            </Button>
          </ListItemEndcap>
          <span className='ml-1 text-sm'>New item</span>
        </div>
      )}
    </div>
  );
};
