//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { id } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { Grid, Item, TestGridLayout } from '../components';
import { useSpace } from '../hooks';
import { Note } from '../proto';

export const NotesFrame = () => {
  const { ref: containerRef } = useResizeDetector();
  const layout = useMemo(() => new TestGridLayout({ range: 2, size: 200, padding: 20 }), []);
  const space = useSpace();
  const notes = useQuery(space, Note.filter());

  const items: Item[] = useMemo(
    () =>
      notes.map((note) => ({
        id: note[id],
        label: note.title,
        content: note.content.model?.textContent // TODO(burdon): Util.
      })),
    [notes]
  );

  useEffect(() => {
    layout.updateItems(items);
  }, [items]);

  const handleDelete = (item: Item) => {
    const note = notes.find((note) => item.id === note[id]);
    if (note) {
      void space.experimental.db.delete(note);
    }
  };

  // TODO(burdon): Overdraw bounds so can click outside.
  return (
    <div ref={containerRef} className='flex flex-1 overflow-auto bg-gray-500'>
      <Grid items={items} layout={layout} onDelete={handleDelete} />
    </div>
  );
};
