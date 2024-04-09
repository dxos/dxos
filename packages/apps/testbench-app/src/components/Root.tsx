//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import * as E from '@dxos/echo-schema'; // TODO(burdon): [API]: Import syntax?
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { Input, Toolbar } from '@dxos/react-ui';

import { ItemList } from './ItemList';
import { ItemType, TextV0Type } from '../data';

export const Root = () => {
  const client = useClient();
  const { identityKey } = client.halo.identity.get() ?? {};

  const space = client.spaces.default;
  // TODO(burdon): Toolbar selector for type.
  // TODO(burdon): [API]: Neither { type: ItemType } doesn't work.
  const objects = useQuery<ItemType>(space, E.Filter.schema(ItemType));

  const [num, setNum] = useState(10);

  const handleAdd = (n = num) => {
    let count = objects.length;
    Array.from({ length: n }).forEach(() => {
      // TODO(burdon): [API]: Automerge strings?
      space.db.add(E.object(ItemType, { text: E.object(TextV0Type, { content: `Item ${++count}` }) }));
    });
  };

  const handleDelete = (id: string) => {
    // TODO(burdon): [API]: Rename delete and just provide ID?
    const object = space.db.getObjectById(id);
    if (object) {
      space.db.remove(object);
    }
  };

  // TODO(burdon): Track how many renders?
  return (
    <div className='flex justify-center fixed inset-0 overflow-hidden bg-neutral-100 dark:bg-neutral-800'>
      <div className='flex flex-col w-full max-w-[40rem] shadow-lg bg-white dark:bg-black divide-y'>
        <div className='flex-col flex-shrink-0 p-2'>
          <table>
            <tbody>
              <tr>
                <td className='text-xs'>identity</td>
                <td className='px-2 font-mono'>{identityKey?.truncate()}</td>
              </tr>
              <tr>
                <td className='text-xs'>space</td>
                <td className='px-2 font-mono'>{space.key.truncate()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <ItemList objects={objects} onDelete={handleDelete} />

        <div className='p-2 text-xs'>{objects.length} objects</div>

        <div className='flex-col shrink-0 p-2'>
          <Toolbar.Root>
            <Toolbar.Button onClick={() => handleAdd()}>Add</Toolbar.Button>
            <Input.Root>
              <Input.TextInput value={num} onChange={(event) => setNum(safeParseInt(event.target.value) ?? num)} />
            </Input.Root>
          </Toolbar.Root>
        </div>
      </div>
    </div>
  );
};

const safeParseInt = (str: string): number | undefined => {
  const value = parseInt(str);
  return isNaN(value) ? undefined : value;
};
