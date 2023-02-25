//
// Copyright 2023 DXOS.org
//

import { ArrowsIn, ArrowsOut } from 'phosphor-react';
import React, { useEffect, useMemo, useReducer, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { GridLensModel, Grid, GridLayout, Item, Location } from '@dxos/mosaic';
import { useClient, useQuery } from '@dxos/react-client';
import { Button, getSize } from '@dxos/react-components';

import { createPath, useAppRouter } from '../../hooks';
import { Note, NoteBoard, Location as LocationProto } from '../../proto';
import { NoteTile } from './NoteTile';

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
  const client = useClient();
  const navigate = useNavigate();

  const { space, frame, objectId } = useAppRouter();
  const boards = useQuery(space, NoteBoard.filter());
  const board = objectId ? (space!.db.getObjectById(objectId) as NoteBoard) : undefined;

  // TODO(burdon): Better, more compact pattern?
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const lensModel = useMemo(() => new GridLensModel(), []);
  useEffect(() => lensModel.onChange.on(() => forceUpdate()), [lensModel]);

  useEffect(() => {
    if (frame && !board && boards.length) {
      navigate(createPath({ spaceKey: space!.key, frame: frame?.module.id, objectId: boards[0].id }));
    }
  }, [frame, boards]);

  // TODO(burdon): Use theme variables.
  // Cells should be 366px wide (390px - 2 x 12px padding) with 24px margins.
  const size = 354;
  const layout = useMemo(() => new GridLayout({ range, dimensions: { width: size, height: size }, padding: 24 }), []);
  const [items, setItems] = useState<Item<Note>[]>([]);

  // TODO(burdon): Filter by notes on board (could be multiple). Extend useQuery.
  //  Causes infinite useEffect loop if filtered after useQuery.
  const notes = useQuery(space, Note.filter()); // .filter((note) => board && getItemLocation(board, note.id));
  useEffect(() => {
    if (!board) {
      return;
    }

    // TODO(burdon): Change API; make space-specific.
    // TODO(burdon): Don't create new subscription.
    const subscription = client.echo.dbRouter.createSubscription(() => {
      setItems(doLayout(board, notes, layout));
    });

    // TODO(burdon): Subscription is initially out of date for newly created items.
    setItems(doLayout(board, notes, layout));
    // subscription.update([board, notes]);
    return () => subscription.unsubscribe();
  }, [board, notes]);

  if (!board) {
    return null;
  }

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
    <>
      <div className='absolute right-0 m-2 z-50'>
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
            over: { className: '__border-red-400 border-4' }
          }
        }}
        Content={NoteTile}
        onChange={handleChange}
        onCreate={handleCreate}
        onDelete={handleDelete}
      />
    </>
  );
};

export default NoteFrame;
