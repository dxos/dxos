//
// Copyright 2023 DXOS.org
//

import { List, Palette, X } from 'phosphor-react';
import React, { FC } from 'react';

import { TileContentProps } from '@dxos/mosaic';
import { observer } from '@dxos/react-client';
import { mx, Button, DropdownMenu, DropdownMenuItem, getSize, Input } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { Note } from '../../proto';

export const colors: { id: string; color: string; border: string }[] = [
  { id: 'gray', color: 'bg-gray-200', border: 'border-gray-300' },
  { id: 'yellow', color: 'bg-amber-100', border: 'border-amber-200' },
  { id: 'cyan', color: 'bg-sky-100', border: 'border-sky-200' },
  { id: 'green', color: 'bg-emerald-100', border: 'border-emerald-200' },
  { id: 'orange', color: 'bg-violet-100', border: 'border-violet-200' }
];

const Menu: FC<{ onDelete: () => void; onColorChange: () => void }> = ({ onDelete, onColorChange }) => {
  return (
    <>
      <DropdownMenuItem onClick={onDelete}>
        <X className={getSize(5)} />
        <span className='mis-2'>Delete</span>
      </DropdownMenuItem>
      <DropdownMenuItem onClick={onColorChange}>
        <Palette className={getSize(5)} />
        <span className='mis-2'>Color</span>
      </DropdownMenuItem>
    </>
  );
};

export const NoteTile = observer(({ item, onDelete }: TileContentProps) => {
  const note = item.data as Note;

  const { color, border } = colors.find(({ id }) => id === note.color) ?? colors[0];

  const handleDelete = () => {
    onDelete?.(item);
  };

  const handleColorChange = () => {
    const idx = colors.findIndex(({ id }) => id === note.color);
    note.color = colors[idx === -1 ? 1 : idx < colors.length - 1 ? idx + 1 : 0].id;
  };

  return (
    <div className={mx('flex flex-1 flex-col overflow-hidden p-3 border', color, border)}>
      <div className='flex w-full overflow-hidden'>
        {/* Actions */}
        <div className='order-1'>
          <DropdownMenu
            trigger={
              <Button variant='ghost' className='p-2'>
                <List className={getSize(5)} />
              </Button>
            }
            slots={{ content: { className: 'z-50' } }}
          >
            <Menu onDelete={handleDelete} onColorChange={handleColorChange} />
          </DropdownMenu>
        </div>

        {/* Title */}
        <Input
          variant='subdued'
          label='Title'
          labelVisuallyHidden
          placeholder='Title'
          slots={{
            root: {
              className: 'w-full'
            },
            input: {
              className: 'p-1 w-full border-0 text-xl',
              autoFocus: true // TODO(burdon): Use ref.
            }
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
          <Composer
            document={note.content}
            slots={{ root: { className: 'grow h-full' }, editor: { className: 'h-full' } }}
          />
        )}
      </div>
    </div>
  );
});
