//
// Copyright 2023 DXOS.org
//

import { XCircle } from 'phosphor-react';
import React from 'react';

import { TileContentProps } from '@dxos/mosaic';
import { withReactor } from '@dxos/react-client';
import { Button, getSize, Input } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { Note } from '../../proto';

export const NoteTile = withReactor(({ item, onDelete }: TileContentProps) => {
  const note = item.data as Note;

  const handleDelete = (event: any) => {
    event.stopPropagation();
    onDelete?.(item);
  };

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <div className='flex w-full overflow-hidden'>
        {/* Actions */}
        <Button
          variant='ghost'
          className='invisible group-hover:visible text-gray-500 mbs-1 mie-1 order-1'
          onClick={handleDelete}
        >
          <XCircle className={getSize(6)} />
        </Button>

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
