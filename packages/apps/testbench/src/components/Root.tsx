//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type ReactiveObject } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema'; // TODO(burdon): [API]: Import syntax?
import { useClient } from '@dxos/react-client';
import { useQuery } from '@dxos/react-client/echo';
import { Toolbar } from '@dxos/react-ui';

import { ItemType } from '../data';

export const Root = () => {
  const client = useClient();
  const { identityKey } = client.halo.identity.get() ?? {};

  const space = client.spaces.default;
  // TODO(burdon): [API]: Neither { type: ItemType } nor E.Filter.schema works.
  const o = useQuery<ItemType>(space, { type: E.Filter.schema(ItemType) });
  const objects = useQuery(space);

  const handleAdd = (n = 1) => {
    let count = objects.length;
    Array.from({ length: n }).forEach(() => {
      // TODO(burdon): [API]: Automerge strings?
      space.db.add(E.object(ItemType, { text: `Item ${++count}` }));
    });
  };

  // TODO(burdon): Track how many renders?
  return (
    <div className='flex justify-center absolute inset-0 overflow-hidden bg-neutral-100 dark:bg-neutral-800'>
      <div className='flex flex-col w-full max-w-[40rem] shadow-lg bg-white dark:bg-black'>
        <div className='flex-col flex-shrink-0 p-2'>
          <table>
            <tbody>
              <tr>
                <td>identity</td>
                <td className='px-2 font-mono'>{identityKey?.truncate()}</td>
              </tr>
              <tr>
                <td>space</td>
                <td className='px-2 font-mono'>{space.key.truncate()}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className='flex-col flex-grow p-2 overflow-y-scroll'>
          {objects.map((object) => (
            <Item key={object.id} object={object} />
          ))}
          {objects.length} / {o.length}
        </div>

        <div className='flex-col flex-shrink-0 p-2'>
          <Toolbar.Root>
            <Toolbar.Button onClick={() => handleAdd()}>Add</Toolbar.Button>
          </Toolbar.Root>
        </div>
      </div>
    </div>
  );
};

// TODO(burdon): Text editor.
const Item: FC<{ object: ReactiveObject<ItemType> }> = ({ object }) => {
  const meta = E.getMeta(object);
  E.getDatabase());
  return (
    <div className='border m-1 p-1'>
      <div className='text-xs'>{object.id.slice(0, 8)}</div>
      <div className='text-xs'>{JSON.stringify(meta)}</div>
      <div>{object.text}</div>
    </div>
  );
};
