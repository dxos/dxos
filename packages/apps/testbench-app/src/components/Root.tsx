//
// Copyright 2024 DXOS.org
//

import { randSentence } from '@ngneat/falso'; // TODO(burdon): Reconcile with echo-generator.
import { Plus } from '@phosphor-icons/react';
import React, { useState } from 'react';

import * as E from '@dxos/echo-schema'; // TODO(burdon): [API]: Import syntax?
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';
import { Input, Toolbar } from '@dxos/react-ui';

import { ItemList } from './ItemList';
import { ItemType, TextV0Type } from '../data';

export const Root = () => {
  const client = useClient();
  const space = client.spaces.default;
  const identity = useIdentity();

  // TODO(burdon): Toolbar selector for type.
  const [filter, setFilter] = useState<string>();

  const objects = useQuery<ItemType>(
    space,
    E.Filter.schema(ItemType, (object: ItemType) => match(filter, object.text?.content)),
  );

  const [num, setNum] = useState(10);

  const handleAdd = (n = num) => {
    Array.from({ length: n }).forEach(() => {
      // TODO(burdon): [API]: Use basic Automerge strings?
      // space.db.add(E.object(ItemType, { content: '' }));
      space.db.add(E.object(ItemType, { text: E.object(TextV0Type, { content: randSentence() }) }));
    });
  };

  const handleDelete = (id: string) => {
    // TODO(burdon): [API]: Rename delete and just provide ID?
    const object = space.db.getObjectById(id);
    if (object) {
      space.db.remove(object);
    }
  };

  return (
    <div className='flex justify-center fixed inset-0 overflow-hidden bg-neutral-100 dark:bg-neutral-800'>
      <div className='flex flex-col w-full max-w-[40rem] shadow-lg bg-white dark:bg-black divide-y'>
        <div className='flex-col flex-shrink-0 p-2'>
          <table>
            <tbody>
              <tr>
                <td className='text-xs'>identity</td>
                <td className='px-2 font-mono'>{identity?.identityKey.truncate()}</td>
              </tr>
              <tr>
                <td className='text-xs'>space</td>
                <td className='px-2 font-mono'>{space.key.truncate()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className='shrink-0 p-2'>
          <Toolbar.Root>
            <Input.Root>
              <Input.TextInput
                placeholder='Filter objects...'
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              />
            </Input.Root>
          </Toolbar.Root>
        </div>

        <ItemList debug objects={objects} onDelete={handleDelete} />

        <div className='shrink-0 p-2'>
          <Toolbar.Root>
            <Toolbar.Button onClick={() => handleAdd()}>
              <Plus />
            </Toolbar.Button>
            <Input.Root>
              <Input.TextInput value={num} onChange={(event) => setNum(safeParseInt(event.target.value) ?? num)} />
            </Input.Root>
          </Toolbar.Root>
        </div>
      </div>
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

const safeParseInt = (str: string): number | undefined => {
  const value = parseInt(str);
  return isNaN(value) ? undefined : value;
};
