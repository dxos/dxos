//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import { XCircle } from 'phosphor-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { id } from '@dxos/echo-schema';
import { Grid, GridLayout, Item, Location, TileContentProps } from '@dxos/mosaic';
import { useQuery, withReactor } from '@dxos/react-client';
import { Button, getSize } from '@dxos/react-components';

import { useSpace } from '../../hooks';
import { Note, NoteBoard, Location as LocationProto } from '../../proto';

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

export const TileContent = withReactor(({ item, selected, onDelete }: TileContentProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (selected) {
      inputRef.current?.focus();
    }
  }, [selected]);

  const handleDelete = (event: any) => {
    event.stopPropagation();
    onDelete?.(item);
  };

  return (
    <div className='flex flex-1 flex-col overflow-hidden'>
      <div className='flex w-full items-center mb-3'>
        {/* Title */}
        <div className='flex flex-1 overflow-hidden'>
          <input
            ref={inputRef}
            className='text-lg w-full outline-0 p-1 bg-transparent'
            placeholder='Title'
            autoFocus={selected} // TODO(burdon): Not working.
            value={item.label}
            onChange={({ target: { value } }) => {
              // TODO(burdon): Breaks abstraction: bubble change event instead.
              const note = item.data! as Note;
              note.title = value;
            }}
          />
        </div>

        {/* Icons */}
        <div className='flex shrink-0 pl-3'>
          <div className='invisible group-hover:visible text-gray-500'>
            <Button compact variant='ghost' onClick={handleDelete} className='mbs-1 mie-1'>
              <XCircle className={getSize(6)} />
            </Button>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className='flex flex-1 overflow-hidden p-1 text-gray-600'>{item.content}</div>
    </div>
  );
});

export const NoteFrame = () => {
  const range = { x: 2, y: 3 };

  const space = useSpace();
  const boards = useQuery(space, NoteBoard.filter());
  const [board, setBoard] = useState<NoteBoard>(boards[0]);
  useEffect(() => {
    if (!board) {
      setTimeout(async () => {
        const board = new NoteBoard();
        await space.experimental.db.save(board);
        setBoard(board);
      });
    }
  }, []);

  // Cells should be 366px wide (390px - 2 x 12px padding) with 24px margins.
  const layout = useMemo(() => new GridLayout({ range, dimensions: { width: 354, height: 354 }, padding: 24 }), []);
  const notes = useQuery(space, Note.filter());
  const items: Item<Note>[] = useMemo(() => {
    if (!board) {
      return [];
    }

    return notes.map((note) => {
      let location = getItemLocation(board, note[id]);
      if (!location) {
        // TODO(burdon): Assign in free location, not randomly.
        location = {
          x: faker.datatype.number({ min: -range.x, max: range.x }),
          y: faker.datatype.number({ min: -range.y, max: range.y })!
        };

        setItemLocation(board, note[id], location);
      }

      const item: Item<Note> = {
        id: note[id],
        label: note.title,
        content: note.content?.model?.textContent, // TODO(burdon): Util.
        location: { x: location.x!, y: location.y! },
        data: note
      };

      return item;
    });
  }, [board, notes]);

  const handleChange = (item: Item, location: Location) => {
    setItemLocation(board, item.id, location);
  };

  const handleCreate = async (location: Location) => {
    const note = new Note({ title: '' });
    await space.experimental.db.save(note);
    setItemLocation(board, note[id], location);
    return note[id];
  };

  const handleDelete = (item: Item) => {
    const note = notes.find((note) => item.id === note[id]);
    if (note) {
      void space.experimental.db.delete(note);
    }
  };

  return (
    <Grid
      items={items}
      layout={layout}
      classes={{
        tile: {
          root: 'bg-yellow-100 w-sidebar shadow select-none cursor-pointer text-black',
          selected: 'shadow-lg ring-1 ring-selection-border'
        }
      }}
      Content={TileContent}
      onChange={handleChange}
      onCreate={handleCreate}
      onDelete={handleDelete}
    />
  );
};
