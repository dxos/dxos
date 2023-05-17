//
// Copyright 2023 DXOS.org
//

import { Plus } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { Button, List, ListItem, ListItemEndcap } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { Input } from '@dxos/react-appkit';

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
  Action?: FC<{ object: T }>;
  slots?: EditableObjectListSlots;
  onSelect?: (id: string) => void;
  onUpdate?: (id: string, text: string) => Promise<void>;
  onCreate?: () => Promise<string | undefined>;
};

// TODO(burdon): Replace with react-components list.
export const EditableObjectList = <T extends Object>({
  objects,
  selected,
  getTitle,
  Icon,
  Action,
  slots = {},
  onSelect,
  onUpdate,
  onCreate,
}: EditableObjectListProps<T>) => {
  const handleCreate = async () => {
    if (onCreate) {
      const objectId = await onCreate();
      if (objectId) {
        onSelect?.(objectId);
      }
    }
  };

  return (
    <div role='none' className={mx('flex flex-col overflow-hidden is-full', slots.root?.className)}>
      <List aria-labelledby='objects'>
        {objects.map((object) => {
          const isSelected = object.id === selected;
          return (
            <ListItem
              id={object.id}
              key={object.id}
              className={['flex w-full px-3 items-center', selected === object.id && slots?.selected?.className]}
            >
              <ListItemEndcap>
                <Button
                  variant='ghost'
                  onClick={() => onSelect?.(object.id)}
                  className={isSelected && 'text-selection-text'}
                >
                  <Icon className={getSize(6)} />
                </Button>
              </ListItemEndcap>

              <Input
                variant='subdued'
                label='Title'
                labelVisuallyHidden
                placeholder='Title'
                // TODO(burdon): Input classname not propagated.
                slots={{
                  root: { className: 'flex w-full overflow-hidden pl-1' },
                  input: { className: 'flex w-full', autoFocus: !getTitle(object)?.length },
                }}
                value={getTitle(object) ?? ''}
                onChange={({ target: { value } }) => onUpdate?.(object.id, value)}
              />

              {Action && (
                <ListItemEndcap asChild>
                  <div className='flex justify-center items-center'>
                    <Action object={object} />
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
