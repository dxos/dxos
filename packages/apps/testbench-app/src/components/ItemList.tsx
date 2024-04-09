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
} & Pick<ItemProps<T>, 'debug' | 'onDelete'>;

export const ItemList = ({ objects, ...props }: ItemListProps<ItemType>) => {
  return (
    <>
      <div className='flex flex-col grow overflow-hidden'>
        <div className='flex flex-col overflow-y-scroll pr-2'>
          {objects.map((object) => (
            <Item key={object.id} object={object} {...props} />
          ))}
        </div>
      </div>
      <div className='p-2 text-xs'>{objects.length} objects</div>
    </>
  );
};

export type ItemProps<T> = {
  object: T;
  debug?: boolean;
  onDelete: (id: string) => void;
};

// TODO(burdon): Use ui list with key nav/selection.
// TODO(burdon): Toggle options to show deleted.
export const Item = ({ object, debug, onDelete }: ItemProps<ItemType>) => {
  // const { themeMode } = useThemeContext(); // TODO(burdon): What is required to config theme?
  // TODO(burdon): [API] How to get accessor for raw Automerge string property?
  const { doc, accessor } = useDocAccessor(object.text!); // TODO(burdon): [API]: Accept undefined?
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
        <div className='flex shrink-0 items-center justify-center w-[40px] h-[40px]'>
          <Input.Root>
            <Input.Checkbox checked={object.done} onCheckedChange={(state) => (object.done = !!state)} />
          </Input.Root>
        </div>
        <div ref={parentRef} className='grow py-1.5' />
        <div className='flex shrink-0 items-center justify-center w-[40px] h-[40px]'>
          <Button variant='ghost' classNames='p-0' onClick={() => onDelete(object.id)}>
            <X />
          </Button>
        </div>
      </div>
      {debug && (
        <div className='flex w-full ml-[40px] px-1.5 text-xs font-mono opacity-25'>
          <div>{JSON.stringify({ id: object.id.slice(0, 8), ...meta })}</div>
        </div>
      )}
    </div>
  );
};
