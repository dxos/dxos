//
// Copyright 2023 DXOS.org
//

import { List, Palette, X } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { Button } from '@dxos/aurora';
import { Composer } from '@dxos/aurora-composer';
import { getSize, mx } from '@dxos/aurora-theme';
import { Note } from '@dxos/kai-types';
import { TileContentProps } from '@dxos/mosaic';
import { DropdownMenu, DropdownMenuItem, Input } from '@dxos/react-appkit';
import { observer } from '@dxos/react-client';

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
          <DropdownMenuItem key={id} onClick={() => onColorChange(id)}>
            <Palette className={getSize(5)} />
            <span className='mis-2'>{id}</span>
          </DropdownMenuItem>
        ))}
      </div>
      <DropdownMenuItem onClick={onDelete}>
        <X className={getSize(5)} />
        <span className='mis-2'>Delete</span>
      </DropdownMenuItem>
    </div>
  );
};

export const NoteTile = observer(({ item, onDelete }: TileContentProps) => {
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
});
