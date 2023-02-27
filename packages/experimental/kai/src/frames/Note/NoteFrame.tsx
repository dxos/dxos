//
// Copyright 2023 DXOS.org
//

import { ArrowsIn, ArrowsOut, PlusCircle } from 'phosphor-react';
import React, { FC, useEffect, useMemo, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { Document } from '@dxos/echo-schema';
import { Grid, GridLayout, GridLensModel, Item, Location } from '@dxos/mosaic';
import { useQuery, useSubscriptionEffect } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';

import { createPath, useAppRouter } from '../../hooks';
import { Note, NoteBoard } from '../../proto';
import { NoteTile } from './NoteTile';

const getItemLocation = (board: NoteBoard, id: string): NoteBoard.Location | undefined =>
  board.locations.find((location) => location.objectId === id);

const setItemLocation = (board: NoteBoard, id: string, location: NoteBoard.Location) => {
  const idx = board.locations.findIndex((location) => location.objectId === id);
  if (idx === -1) {
    board.locations.push({ objectId: id, ...location });
  } else {
    board.locations.splice(idx, 1, { objectId: id, ...location });
  }
};

// TODO(burdon): Extend layout.
const doLayout = (board: NoteBoard, notes: Note[], layout: GridLayout): Item<Note>[] => {
  // TODO(burdon): Memoize and update existing map.
  return notes
    .map((note) => {
      const location = getItemLocation(board, note.id);
      if (!location) {
        return undefined;
      }

      const item: Item<Note> = {
        id: note.id,
        location: { x: location.x!, y: location.y! },
        data: note
      };

      return item;
    })
    .filter(Boolean) as Item<Note>[];
};

export const NoteFrame = () => {
  const range = { x: 4, y: 3 };

  const { space, frame, objectId } = useAppRouter();
  const board = objectId ? space!.db.getObjectById<NoteBoard>(objectId) : undefined;
  const boards = useQuery(space, NoteBoard.filter());
  const notes = useQuery(
    space,
    (object: Document) => board && object.__typename === Note.type.name && getItemLocation(board, object.id),
    [board]
  ) as Note[];

  // Rerender when offset, zoom changed.
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const lensModel = useMemo(() => new GridLensModel(), []);
  useEffect(() => lensModel.onChange.on(() => forceUpdate()), [lensModel]);

  // Redirect if nothing selected.
  const navigate = useNavigate();
  useEffect(() => {
    if (frame && !board && boards.length) {
      navigate(createPath({ spaceKey: space!.key, frame: frame?.module.id, objectId: boards[0].id }));
    }
  }, [frame, boards]);

  // TODO(burdon): Unify layout (setting location vs. setting positions).
  // Cells should be 366px wide (390px - 2 x 12px padding) with 24px margins.
  const size = 354; // TODO(burdon): Use theme variables.
  const layout = useMemo(() => new GridLayout({ range, dimensions: { width: size, height: size }, padding: 24 }), []);

  // Update layout on change.
  const [items, setItems] = useState<Item<Note>[]>([]);
  useSubscriptionEffect(() => {
    // TODO(burdon): Rename.
    if (board) {
      setItems(doLayout(board, notes, layout));
    }
  }, [board, notes]);

  const handleCreateBoard = () => {
    void space?.db.add(new NoteBoard());
  };

  const handleCreateNote = async (location: Location) => {
    const note = new Note();
    setItemLocation(board!, note.id, location);
    // TODO(burdon): Need transaction.
    // NOTE: Must happen after updating board; otherwise will be assigned a random location on layout.
    await space?.db.add(note);
    return note.id;
  };

  const handleDeleteNote = (item: Item) => {
    const note = notes.find((note) => item.id === note.id);
    if (note) {
      void space?.db.remove(note);
    }
  };

  const handleMoveNote = (item: Item, location: Location) => {
    setItemLocation(board!, item.id, location);
  };

  if (!board) {
    if (!frame) {
      return null;
    }

    return <CenterButton onCreate={handleCreateBoard} />;
  }

  return (
    <>
      {/* TODO(burdon): Standardize overlays. */}
      <div className='absolute right-0 z-10 m-2'>
        <Button
          title='Double-click board to toggle zoom.'
          onClick={() => {
            lensModel.toggleZoom();
          }}
        >
          {lensModel.zoom === 1 ? <ArrowsOut className={getSize(6)} /> : <ArrowsIn className={getSize(6)} />}
        </Button>
      </div>

      <Grid
        items={items}
        layout={layout}
        lensModel={lensModel}
        slots={{
          tile: {
            root: { className: 'w-sidebar select-none cursor-pointer opacity-100' }
          },
          cell: {
            over: { className: 'border-4' }
          }
        }}
        Content={NoteTile}
        onChange={handleMoveNote}
        onCreate={handleCreateNote}
        onDelete={handleDeleteNote}
      />
    </>
  );
};

// TODO(burdon): Factor out..
const CenterButton: FC<{ onCreate: () => void }> = ({ onCreate }) => {
  return (
    <div className='flex flex-1 flex-col justify-center items-center'>
      <div className='flex p-6 border-2 rounded-lg bg-white'>
        <Button variant='ghost' onClick={onCreate}>
          <PlusCircle className={mx(getSize(16), 'text-neutral-500')} />
        </Button>
      </div>
    </div>
  );
};

export default NoteFrame;
