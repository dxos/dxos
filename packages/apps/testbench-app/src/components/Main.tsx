//
// Copyright 2024 DXOS.org
//

import { randSentence } from '@ngneat/falso'; // TODO(burdon): Reconcile with echo-generator.
import React, { useState } from 'react';

import * as E from '@dxos/echo-schema'; // TODO(burdon): [API]: Import syntax?
import { useClient } from '@dxos/react-client';
import { type Space, useQuery } from '@dxos/react-client/echo';

import { AppToolbar } from './AppToolbar';
import { DataToolbar } from './DataToolbar';
import { ItemList } from './ItemList';
import { SpaceToolbar } from './SpaceToolbar';
import { ItemType, TextV0Type } from '../data';
import { defs } from '../defs';

export const Main = () => {
  const client = useClient();
  const [space, setSpace] = useState<Space>();

  // TODO(burdon): Toolbar selector for type.
  const [filter, setFilter] = useState<string>();
  const objects = useQuery<ItemType>(
    space,
    E.Filter.schema(ItemType, (object: ItemType) => match(filter, object.text?.content)),
    {},
    [filter],
  );

  const handleAdd = (n = 1) => {
    if (!space) {
      return;
    }

    Array.from({ length: n }).forEach(() => {
      // TODO(burdon): Migrate generator from DebugPlugin.
      // TODO(burdon): [API]: Use basic Automerge strings?
      // space.db.add(E.object(ItemType, { content: '' }));
      space.db.add(E.object(ItemType, { text: E.object(TextV0Type, { content: randSentence() }) }));
    });
  };

  const handleDelete = (id: string) => {
    if (!space) {
      return;
    }

    // TODO(burdon): [API]: Rename delete and just provide ID?
    const object = space.db.getObjectById(id);
    if (object) {
      space.db.remove(object);
    }
  };

  return (
    <div className='flex flex-col grow max-w-[40rem] shadow-lg bg-white dark:bg-black divide-y'>
      <AppToolbar onHome={() => window.open(defs.issueUrl, 'dxos')} />

      <SpaceToolbar
        onCreate={async () => {
          const space = await client.spaces.create();
          return space.key;
        }}
        onSelect={(key) => {
          setSpace(key ? client.spaces.get(key) : undefined);
        }}
        // TODO(burdon): Copy invitation key.
        onInvite={(key) => {}}
      />

      <>
        {space && <DataToolbar onAdd={handleAdd} onFilterChange={setFilter} />}

        <ItemList debug objects={objects} onDelete={handleDelete} />
      </>
    </div>
  );
};

const match = (filter: string | undefined, text: string | undefined) => {
  if (!filter?.length) {
    return true;
  }

  if (!text?.length) {
    return false;
  }

  const content = text.toLowerCase();
  const words = filter.split(/\s+/).map((word: string) => word.toLowerCase());
  return !words.some((word) => content.indexOf(word) === -1);
};
