//
// Copyright 2024 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React from 'react';

import * as E from '@dxos/echo-schema';
import { Button, Input } from '@dxos/react-ui';
import { automerge, createBasicExtensions, useDocAccessor, useTextEditor } from '@dxos/react-ui-editor';

import { type ItemType } from '../data';

// TODO(burdon): List and Table variants.

export type ItemListProps<T> = {
  objects: T[];
} & Pick<ItemProps<T>, 'onDelete'>;

export const ItemList = ({ objects, ...props }: ItemListProps<ItemType>) => {
  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex flex-col overflow-y-scroll pr-2'>
        {objects.map((object) => (
          <Item key={object.id} object={object} {...props} />
        ))}
      </div>
    </div>
  );
};

export type ItemProps<T> = {
  object: T;
  onDelete: (id: string) => void;
};

// TODO(burdon): Use ui list with key nav/selection.
// TODO(burdon): Toggle options to show deleted.
export const Item = ({ object, onDelete }: ItemProps<ItemType>) => {
  // const { themeMode } = useThemeContext(); // TODO(burdon): Set-up theme.
  invariant(object.text, 'Missing text.'); // TODO(burdon): [API]: Accept undefined?
  const { doc, accessor } = useDocAccessor(object.text);
  const meta = E.getMeta(object);
  // TODO(burdon): Cannot focus item.
  const { parentRef } = useTextEditor(
    () => ({
      doc,
      extensions: [
        //
        createBasicExtensions(),
        // createThemeExtensions({ themeMode }),
        automerge(accessor),
      ],
    }),
    [doc, accessor],
  );

  return (
    <div className='flex flex-col'>
      <div className='flex w-full justify-between'>
        <div className='flex items-center justify-center w-[40px] h-[40py]'>
          <Input.Root>
            <Input.Checkbox checked={object.done} onCheckedChange={(state) => (object.done = !!state)} />
          </Input.Root>
        </div>
        <div ref={parentRef} className='grow py-2' />
        <Button variant='ghost' classNames='p-0' onClick={() => onDelete(object.id)}>
          <X />
        </Button>
      </div>
      <div className='flex w-full ml-[40px] px-1.5 text-xs font-mono opacity-25'>
        <div>{object.id.slice(0, 8)}</div>&nbsp;
        <div>{JSON.stringify(meta)}</div>
      </div>
    </div>
  );
};
