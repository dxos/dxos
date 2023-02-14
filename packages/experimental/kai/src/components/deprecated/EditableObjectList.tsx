//
// Copyright 2023 DXOS.org
//

import { Circle, Plus } from 'phosphor-react';
import React, { FC } from 'react';

import { Document } from '@dxos/echo-schema';
import { id } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';

import { Button } from './Button';
import { Input } from './Input';
import { List, ListItemButton } from './List';

// TODO(burdon): Make fully generic (don't depend on Document).
export type EditableObjectListProps<T extends Document> = {
  objects: T[];
  selected?: string;
  getTitle: (object: T) => string;
  Icon: FC<any>;
  Action?: FC<any>;
  onSelect?: (id: string) => void;
  onAction?: (id: string) => Promise<void>;
  onUpdate?: (id: string, text: string) => Promise<void>;
  onCreate?: () => Promise<string>;
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
    <div className='flex flex-col w-full'>
      <List>
        {objects.map((object) => (
          <ListItemButton key={object[id]}>
            <div
              className={mx('px-2 cursor-pointer', object[id] === selected && 'text-selection-text')}
              onClick={() => onSelect?.(object[id])}
            >
              <Icon className={getSize(6)} />
            </div>
            <Input
              className='w-full p-1'
              value={getTitle(object)}
              onChange={(text: string) => onUpdate?.(object[id], text)}
              placeholder='Title'
              autoFocus={!getTitle(object)?.length}
            />
            {onAction && (
              <div className='pr-2' onClick={() => onAction?.(object[id])}>
                <ActionIcon className={getSize(6)} />
              </div>
            )}
          </ListItemButton>
        ))}
      </List>

      {onCreate && (
        <div className='flex px-4 py-2'>
          <Button onClick={handleCreate}>
            <Plus className={getSize(6)} />
          </Button>
        </div>
      )}
    </div>
  );
};
