//
// Copyright 2023 DXOS.org
//

import { ArrowsIn, ArrowsOut } from '@phosphor-icons/react';
import React, { useEffect, useMemo, useReducer, useState } from 'react';

import { Button } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { Note, NoteBoard } from '@dxos/kai-types';
import { Grid, GridLayout, GridLensModel, Item, Location } from '@dxos/mosaic';
import { TextKind } from '@dxos/protocols/proto/dxos/echo/model/text';
import { Text, useQuery, useSubscription } from '@dxos/react-client/echo';

import { NoteTile } from './NoteTile';
import { useFrameContext } from '../../hooks';

const getItemLocation = (board: NoteBoard, id: string): NoteBoard.Location | undefined =>
  board.locations.find((location) => location.objectId === id);

const setItemLocation = (board: NoteBoard, id: string, location: Location) => {
  const idx = board.locations.findIndex((location) => location.objectId === id);
  if (idx === -1) {
    board.locations.push({ ...location, objectId: id });
  } else {
    // TODO(burdon): If not object, then remove based on ID.
    board.locations.splice(idx, 1, { ...location, objectId: id });
  }
};

// TODO(burdon): Extend layout.
const doLayout = (board: NoteBoard, notes: Note[], layout: GridLayout): Item<Note>[] => {
  // TODO(burdon): Memoize and update existing map.
  return notes
    .map((note) => {
      const location = getItemLocation(board, note.id); // TODO(burdon): See query below.
      if (!location) {
        return undefined;
      }

      const item: Item<Note> = {
        id: note.id,
        location: { x: location.x!, y: location.y! },
        data: note,
      };

      return item;
    })
    .filter(Boolean) as Item<Note>[];
};

export const NoteFrame = () => {
  const range = { x: 4, y: 3 }; // TODO(burdon): Props.

  const { space, objectId } = useFrameContext();
  const board = objectId ? space!.db.getObjectById<NoteBoard>(objectId) : undefined;
  const notes = useQuery(space, Note.filter());

  // Rerender when offset, zoom changed.
  const [, forceUpdate] = useReducer((x) => x + 1, 0);
  const lensModel = useMemo(() => new GridLensModel(), []);
  useEffect(() => lensModel.onChange.on(() => forceUpdate()), [lensModel]);

  // TODO(burdon): Unify layout (setting location vs. setting positions).
  // Cells should be 366px wide (390px - 2 x 12px padding) with 24px margins.
  const size = 354; // TODO(burdon): Use theme variables.
  const layout = useMemo(() => new GridLayout({ range, dimensions: { width: size, height: size }, padding: 24 }), []);

  // Update layout on change.
  const [items, setItems] = useState<Item<Note>[]>([]);
  // TODO(wittjosiah): Remove?
  useSubscription(() => {
    // TODO(burdon): Board is stale (undefined -- even though set below).
    if (board) {
      setItems(doLayout(board, notes, layout));
    }
  }, [board, notes]);

  const handleCreateNote = async (location: Location) => {
    // TODO(wittjosiah): Remove text initalization once rich text annotation is hooked up.
    const note = new Note({ content: new Text('', TextKind.RICH) });
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
    return null;
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
            root: { className: 'w-sidebar select-none cursor-pointer opacity-100' },
          },
          cell: {
            over: { className: 'border-4' },
          },
        }}
        Content={NoteTile}
        onChange={handleMoveNote}
        onCreate={handleCreateNote}
        onDelete={handleDeleteNote}
      />
    </>
  );
};

export default NoteFrame;
