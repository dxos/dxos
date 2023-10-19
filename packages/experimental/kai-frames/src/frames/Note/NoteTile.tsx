//
// Copyright 2023 DXOS.org
//

import { List, Palette, X } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { Button, DropdownMenu } from '@dxos/react-ui';
import { Composer } from '@dxos/react-ui-composer';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Note } from '@dxos/kai-types';
import { TileContentProps } from '@dxos/mosaic';
import { Input } from '@dxos/react-appkit';

export const colors: { id: string; color: string; border: string }[] = [
  { id: 'gray', color: 'bg-gray-200', border: 'border-gray-300' },
  { id: 'yellow', color: 'bg-amber-100', border: 'border-amber-200' },
  { id: 'cyan', color: 'bg-sky-100', border: 'border-sky-200' },
  { id: 'green', color: 'bg-emerald-100', border: 'border-emerald-200' },
  { id: 'violet', color: 'bg-violet-100', border: 'border-violet-200' },
];

const Menu: FC<{ onDelete: () => void; onColorChange: (id: string) => void }> = ({ onDelete, onColorChange }) => {
  return (
    <div className='flex flex-col'>
      <div className='border-b'>
        {colors.map(({ id }) => (
          <DropdownMenu.Item key={id} onClick={() => onColorChange(id)}>
            <Palette className={getSize(5)} />
            <span className='mis-2'>{id}</span>
          </DropdownMenu.Item>
        ))}
      </div>
      <DropdownMenu.Item onClick={onDelete}>
        <X className={getSize(5)} />
        <span className='mis-2'>Delete</span>
      </DropdownMenu.Item>
    </div>
  );
};

export const NoteTile = ({ item, onDelete }: TileContentProps<Note>) => {
  const note = item.data as Note;

  const { color, border } = colors.find(({ id }) => id === note.color) ?? colors[0];

  const handleDelete = () => {
    onDelete?.(item);
  };

  const handleColorChange = (color: string) => {
    note.color = color;
  };

  return (
    <div className={mx('flex flex-1 flex-col overflow-hidden p-3 border', color, border)}>
      <div className='flex w-full overflow-hidden'>
        {/* Actions */}
        <div className='order-1'>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant='ghost' classNames='p-2'>
                <List className={getSize(5)} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content classNames='z-50'>
                <DropdownMenu.Viewport>
                  <Menu onDelete={handleDelete} onColorChange={handleColorChange} />
                </DropdownMenu.Viewport>
                <DropdownMenu.Arrow />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>

        {/* Title */}
        <Input
          variant='subdued'
          label='Title'
          labelVisuallyHidden
          placeholder='Title'
          slots={{
            root: {
              className: 'w-full',
            },
            input: {
              className: 'p-1 w-full border-0 text-xl',
              autoFocus: true, // TODO(burdon): Use ref.
            },
          }}
          value={note.title ?? ''}
          onChange={(event) => {
            note.title = event.target.value;
          }}
        />
      </div>

      {/* Content */}
      {/* TODO(burdon): Error when syncing: Cannot read properties of undefined (reading doc). */}
      <div className='flex flex-1 overflow-hidden mt-2 p-1 text-gray-600'>
        {note.content && (
          // TODO(wittjosiah): Hook up cursors with space.
          <Composer
            text={note.content}
            slots={{ root: { className: 'grow h-full' }, editor: { className: 'h-full' } }}
          />
        )}
      </div>
    </div>
  );
};
