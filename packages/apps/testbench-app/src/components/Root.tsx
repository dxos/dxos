//
// Copyright 2024 DXOS.org
//

import { randSentence } from '@ngneat/falso'; // TODO(burdon): Reconcile with echo-generator.
import { Plus } from '@phosphor-icons/react';
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
  const [filter, setFilter] = useState<string>();
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

  const objects = useQuery<ItemType>(
    space,
    E.Filter.schema(ItemType, (object: ItemType) => match(filter, object.text?.content)),
  );

  const [num, setNum] = useState(10);

  const handleAdd = (n = num) => {
    const count = objects.length;
    Array.from({ length: n }).forEach(() => {
      // TODO(burdon): [API]: Automerge strings?
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

const safeParseInt = (str: string): number | undefined => {
  const value = parseInt(str);
  return isNaN(value) ? undefined : value;
};
