//
// Copyright 2023 DXOS.org
//

import { Circle, Plus } from 'phosphor-react';
import React, { FC } from 'react';

import { Document } from '@dxos/echo-schema';
import { getSize, List, ListItem, Button, Input, ListItemEndcap, mx } from '@dxos/react-components';

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
    <div role='none' className='is-full'>
      <List labelId='todo'>
        {objects.map((object) => {
          const isSelected = object.id === selected;
          return (
            <ListItem id={object.id} key={object.id}>
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
                  root: { className: 'grow' },
                  input: { autoFocus: !getTitle(object)?.length }
                }}
                value={getTitle(object)}
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
        <Button variant='ghost' onClick={handleCreate} className='mbs-2'>
          <Plus className={getSize(6)} />
        </Button>
      )}
    </div>
  );
};
