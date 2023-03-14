//
// Copyright 2023 DXOS.org
//

import { Circle, Plus } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { Document } from '@dxos/echo-schema';
import { getSize, List, ListItem, Button, Input, ListItemEndcap, mx } from '@dxos/react-components';

export type EditableObjectListSlots = {
  root?: {
    className?: string;
  };
  selected?: {
    className?: string;
  };
};

// TODO(burdon): Make fully generic (don't depend on Document).
export type EditableObjectListProps<T extends Document> = {
  objects: T[];
  selected?: string;
  getTitle: (object: T) => string;
  Icon: FC<any>;
  Action?: FC<any>;
  slots?: EditableObjectListSlots;
  onSelect?: (id: string) => void;
  onAction?: (id: string) => void;
  onUpdate?: (id: string, text: string) => Promise<void>;
  onCreate?: () => string;
};

// TODO(burdon): Replace with react-components list.
// TODO(burdon): onCreate, onUpdate title.
// TODO(burdon): Focus on create.
// TODO(burdon): Delete.
export const EditableObjectList = <T extends Document>({
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
      const objectId = onCreate();
      if (objectId) {
        onSelect?.(objectId);
      }
    }
  };

  const ActionIcon = Action ?? Circle;

  return (
    <div role='none' className={mx('is-full', slots.root?.className)}>
      <List labelId='todo'>
        {objects.map((object) => {
          const isSelected = object.id === selected;
          return (
            <ListItem
              id={object.id}
              key={object.id}
              slots={{
                root: {
                  className: selected === object.id ? slots?.selected?.className : undefined
                }
              }}
            >
              <ListItemEndcap asChild>
                <Button
                  variant='ghost'
                  onClick={() => onSelect?.(object.id)}
                  className={mx('p-0 flex items-center justify-center gap-1', isSelected ? 'text-selection-text' : '')}
                >
                  <Icon className={getSize(6)} />
                </Button>
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
                  <Button
                    variant='ghost'
                    className='p-0 flex items-center justify-center'
                    onClick={() => onAction?.(object.id)}
                  >
                    <ActionIcon className={getSize(6)} />
                  </Button>
                </ListItemEndcap>
              )}
            </ListItem>
          );
        })}
      </List>

      {onCreate && (
        <ListItemEndcap>
          <Button variant='ghost' onClick={handleCreate}>
            <Plus className={getSize(5)} />
          </Button>
        </ListItemEndcap>
      )}
    </div>
  );
};
