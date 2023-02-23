//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import { XCircle } from 'phosphor-react';
import React, { useEffect, useMemo, useState } from 'react';

import { Grid, GridLayout, Item, Location, TileContentProps } from '@dxos/mosaic';
import { useQuery, withReactor } from '@dxos/react-client';
import { Button, getSize, Input } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { useAppRouter } from '../../hooks';
import { Note, NoteBoard, Location as LocationProto } from '../../proto';

// TODO(burdon): Move to layout.

const getItemLocation = (board: NoteBoard, id: string): LocationProto | undefined =>
  board.locations.find((location) => location.objectId === id);

const setItemLocation = (board: NoteBoard, id: string, location: LocationProto) => {
  const idx = board.locations.findIndex((location) => location.objectId === id);
  if (idx === -1) {
    board.locations.push({ objectId: id, ...location });
  } else {
    board.locations.splice(idx, 1, { objectId: id, ...location });
  }
};

const doLayout = (board: NoteBoard, notes: Note[], layout: GridLayout) => {
  // TODO(burdon): Memoize and update existing map.
  return notes.map((note) => {
    let location = getItemLocation(board, note.id);
    if (!location) {
      // TODO(burdon): Assign in free location, not randomly.
      location = {
        x: faker.datatype.number({ min: -layout.range.x, max: layout.range.x }),
        y: faker.datatype.number({ min: -layout.range.y, max: layout.range.y })!
      };

      setItemLocation(board, note.id, location);
    }

    const item: Item<Note> = {
      id: note.id,
      location: { x: location.x!, y: location.y! },
      data: note
    };

    return item;
  });
};

export const TileContent = withReactor(({ item, selected, onDelete }: TileContentProps) => {
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
            label='Title'
            variant='subdued'
            value={note.title}
            onChange={(event) => {
              note.title = event.target.value;
            }}
            placeholder='Title'
            slots={{
              label: { className: 'sr-only' },
              root: {
                className: 'm-0 w-full'
              },
              input: {
                className: 'p-1 w-full border-0 text-xl',
                autoFocus: true // TODO(burdon): Apply selectively?
              }
            }}
          />
        </div>

        {/* Actions */}
        <div className='flex shrink-0 pl-2'>
          <div className='invisible group-hover:visible text-gray-500'>
            <Button compact variant='ghost' onClick={handleDelete} className='mbs-1 mie-1'>
              <XCircle className={getSize(6)} />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {/* TODO(burdon): Error when syncing: Cannot read properties of undefined (reading doc). */}
      <div className='flex flex-1 overflow-hidden p-1 text-gray-600'>
        <Composer
          document={note.content}
          slots={{ root: { className: 'grow h-full' }, editor: { className: 'h-full' } }}
        />
      </div>
    </div>
  );
});

export const NoteFrame = () => {
  const range = { x: 2, y: 3 };

  const { space } = useAppRouter();
  const boards = useQuery(space, NoteBoard.filter());
  const [board, setBoard] = useState<NoteBoard>(boards[0]);
  useEffect(() => {
    if (!board) {
      setTimeout(async () => {
        const board = new NoteBoard();
        await space?.db.add(board);
        setBoard(board);
      });
    }
  }, []);

  // TODO(burdon): Use theme variables.
  // Cells should be 366px wide (390px - 2 x 12px padding) with 24px margins.
  const layout = useMemo(() => new GridLayout({ range, dimensions: { width: 354, height: 354 }, padding: 24 }), []);
  const notes = useQuery(space, Note.filter());
  const [items, setItems] = useState<Item<Note>[]>([]);
  useEffect(() => {
    if (!board) {
      return;
    }

    // TODO(burdon): Note updated if board locations change.
    setItems(doLayout(board, notes, layout));
  }, [board, notes]);

  const handleChange = (item: Item, location: Location) => {
    setItemLocation(board, item.id, location);
  };

  const handleCreate = async (location: Location) => {
    const note = new Note();
    setItemLocation(board, note.id, location);
    // TODO(burdon): Need transaction.
    // NOTE: Must happen after updating board; otherwise will be assigned a random location on layout.
    await space?.db.add(note);
    return note.id;
  };

  const handleDelete = (item: Item) => {
    const note = notes.find((note) => item.id === note.id);
    if (note) {
      void space?.db.remove(note);
    }
  };

  return (
    <Grid
      items={items}
      layout={layout}
      slots={{
        tile: {
          root: { className: 'bg-yellow-100 w-sidebar select-none cursor-pointer shadow-1' },
          selected: { className: 'ring-1 ring-selection-border' }
        }
      }}
      Content={TileContent}
      onChange={handleChange}
      onCreate={handleCreate}
      onDelete={handleDelete}
    />
  );
};
