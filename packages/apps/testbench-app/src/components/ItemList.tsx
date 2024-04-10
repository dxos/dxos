//
// Copyright 2024 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React from 'react';

import { getRawDoc } from '@dxos/echo-schema';
import * as E from '@dxos/echo-schema';
import { Button, Input, useThemeContext } from '@dxos/react-ui';
import {
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx, subtleHover } from '@dxos/react-ui-theme';

import { type ItemType } from '../data';

export type ItemListProps<T> = {
  objects: T[];
} & Pick<ItemProps<T>, 'debug' | 'onDelete'>;

export const ItemList = ({ objects, debug, ...props }: ItemListProps<ItemType>) => {
  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex flex-col overflow-y-scroll pr-2'>
        {objects.map(
          (object) =>
            (debug && <DebugItem key={object.id} object={object} {...props} />) ||
            /* TODO: Workaround for useDocAccessor issue */
            (object.text ? <Item key={object.id} object={object} {...props} /> : <div key={object.id} />),
        )}
      </div>
    </div>
  );
};

export type ItemProps<T> = {
  object: T;
  debug?: boolean;
  onDelete: (id: string) => void;
};

// TODO(burdon): Use ui list with key nav/selection.
// TODO(burdon): Toggle options to show deleted.
export const Item = ({ object, onDelete }: ItemProps<ItemType>) => {
  const { themeMode } = useThemeContext(); // TODO(burdon): What is required to config theme?

  const { parentRef } = useTextEditor(
    () => ({
      doc: object.content,
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode }),
        automerge(getRawDoc(object, ['content'])), // TODO(burdon): [API]: Type safe?
      ],
    }),
    [],
  );

  // TODO(burdon): Hover.
  return (
    <div className={mx('flex flex-col', subtleHover)}>
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
    </div>
  );
};

// TODO(burdon): Add metadata.
export const DebugItem = ({ object, onDelete }: Pick<ItemProps<ItemType>, 'object' | 'onDelete'>) => {
  const meta = E.getMeta(object);
  const deleted = JSON.stringify(object).indexOf('@deleted') !== -1; // TODO(burdon): [API] Missing API.
  return (
    <div className='flex w-full px-1.5 py-1 text-sm font-thin font-mono'>
      <pre className='grow'>{JSON.stringify({ id: object.id.slice(0, 8), deleted, ...meta }, undefined, 2)}</pre>
      <Button variant='ghost' classNames='p-0' onClick={() => onDelete(object.id)}>
        <X />
      </Button>
    </div>
  );
};
