//
// Copyright 2023 DXOS.org
//

import faker from 'faker';
import React, { useMemo } from 'react';

import { id } from '@dxos/echo-schema';
import { Hypercard, Item, Point, GridHypercardLayout } from '@dxos/hypercard';
import { useQuery } from '@dxos/react-client';

import { useSpace } from '../hooks';
import { Note } from '../proto';

export const NotesFrame = () => {
  const range = 2;
  const layout = useMemo(() => new GridHypercardLayout({ range, size: 200, padding: 20 }), []);
  const space = useSpace();
  const notes = useQuery(space, Note.filter());

  // TODO(burdon): Store points in kanban object.
  const points = useMemo(() => new Map<string, Point | undefined>(), []);
  const items: Item[] = useMemo(() => {
    return notes.map((note) => {
      let point = points.get(note[id]);
      if (!point) {
        point = {
          x: faker.datatype.number({ min: -range, max: range }),
          y: faker.datatype.number({ min: -range, max: range })
        };

        points.set(note[id], point);
      }

      return {
        id: note[id],
        point,
        label: note.title,
        content: note.content?.model?.textContent // TODO(burdon): Util.
      };
    });
  }, [notes]);

  const handleCreate = async (point: Point) => {
    const note = new Note({ title: 'note' });
    await space.experimental.db.save(note);
    points.set(note[id], point);
  };

  const handleDelete = (item: Item) => {
    const note = notes.find((note) => item.id === note[id]);
    if (note) {
      void space.experimental.db.delete(note);
    }
  };

  return (
    <Hypercard
      items={items}
      layout={layout}
      classes={{
        cell: 'bg-yellow-100 shadow select-none cursor-pointer text-black'
      }}
      onCreate={handleCreate}
      onDelete={handleDelete}
    />
  );
};

export default NotesFrame;
