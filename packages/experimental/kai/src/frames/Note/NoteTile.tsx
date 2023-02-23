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
      <div className='flex w-full items-center mb-3'>
        {/* Title */}
        <div className='flex flex-col flex-1 overflow-hidden'>
          <Input
            variant='subdued'
            label='Title'
            labelVisuallyHidden
            placeholder='Title'
            slots={{
              root: {
                className: 'm-0 w-full'
              },
              input: {
                tabIndex: 1,
                className: 'p-1 w-full border-0 text-xl',
                autoFocus: true // TODO(burdon): Use ref.
              }
            }}
            value={note.title}
            onChange={(event) => {
              note.title = event.target.value;
            }}
          />
        </div>

        {/* Actions */}
        <div className='flex shrink-0 pl-2'>
          <div className='invisible group-hover:visible text-gray-500'>
            <Button tabIndex={3} variant='ghost' onClick={handleDelete} className='mbs-1 mie-1'>
              <XCircle className={getSize(6)} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {/* TODO(burdon): Error when syncing: Cannot read properties of undefined (reading doc). */}
      <div className='flex flex-1 overflow-hidden p-1 text-gray-600'>
        {note.content && (
          <Composer
            document={note.content}
            slots={{ root: { className: 'grow h-full' }, editor: { className: 'h-full', tabIndex: 2 } }}
          />
        )}
      </div>
    </div>
  );
});
