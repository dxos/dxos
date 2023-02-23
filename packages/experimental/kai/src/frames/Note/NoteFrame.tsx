//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import React, { useEffect, useMemo, useState } from 'react';

import { Grid, GridLayout, Item, Location } from '@dxos/mosaic';
import { useClient, useQuery } from '@dxos/react-client';

import { useAppRouter } from '../../hooks';
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

export const NoteFrame = () => {
  const range = { x: 2, y: 3 };

  const client = useClient();
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
    // TODO(burdon): Change API; make space-specific.
    // TODO(burdon): Don't create new subscription.
    const subscription = client.echo.dbRouter.createSubscription(() => {
      setItems(doLayout(board, notes, layout));
    });

    subscription.update([board, notes]);
    return () => subscription.unsubscribe();
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

  // TODO(burdon): Select colors.
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
      Content={NoteTile}
      onChange={handleChange}
      onCreate={handleCreate}
      onDelete={handleDelete}
    />
  );
};
