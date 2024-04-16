//
// Copyright 2024 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React from 'react';

import { createDocAccessor, getMeta, getSchema, type ReactiveObject } from '@dxos/echo-schema';
import { Button, Input, useThemeContext } from '@dxos/react-ui';
import {
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx, subtleHover } from '@dxos/react-ui-theme';

import { classifySchemaProperties } from '../util';

const MAX_RENDERED_COUNT = 80;

export type ItemListProps<T> = {
  objects: T[];
} & Pick<ItemProps<T>, 'debug' | 'onDelete'>;

export const ItemList = ({ objects, debug, ...props }: ItemListProps<ReactiveObject<any>>) => {
  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex flex-col overflow-y-scroll pr-2'>
        {objects
          .slice(0, MAX_RENDERED_COUNT)
          .map(
            (object) =>
              (debug && <DebugItem key={object.id} object={object} {...props} />) || (
                <Item key={object.id} object={object} {...props} />
              ),
          )}
        {objects.length > MAX_RENDERED_COUNT && (
          <div className='text-xs text-gray-400'>({objects.length - MAX_RENDERED_COUNT} more items)</div>
        )}
      </div>
    </div>
  );
};

const labelProps = 'shrink-0 w-20 text-right text-primary-500 px-2 py-[2px]';

export type ItemProps<T> = {
  object: T;
  debug?: boolean;
  onDelete: (id: string) => void;
};

// TODO(burdon): Use ui list with key nav/selection.
// TODO(burdon): Toggle options to show deleted.
export const Item = ({ object, onDelete }: ItemProps<ReactiveObject<any>>) => {
  const schema = getSchema(object);
  if (!schema) {
    return <DebugItem object={object} onDelete={onDelete} />;
  }

  // TODO(burdon): Get additional metadata.
  const props = classifySchemaProperties(schema);

  // TODO(burdon): [API]: Type check?
  const getValue = (object: ReactiveObject<any>, prop: string) => (object as any)[prop];
  const setValue = (object: ReactiveObject<any>, prop: string, value: any) => {
    (object as any)[prop] = value;
  };

  return (
    <div className={mx('flex m-1 p-2 border', subtleHover)}>
      <div className='flex flex-col grow overflow-hidden gap-2'>
        {props.map(([prop, type]) => (
          <div key={prop} className='flex'>
            {/* TODO(burdon): Check if editable or meta prop (e.g., id). */}
            {prop === 'id' && (
              <Input.Root>
                <Input.Label classNames={labelProps}>{prop}</Input.Label>
                <div className='font-mono text-xs py-1'>{getValue(object, prop).slice(0, 8)}</div>
              </Input.Root>
            )}
            {type === 'boolean' && (
              <Input.Root>
                <Input.Label classNames={labelProps}>{prop}</Input.Label>
                <Input.Checkbox
                  checked={(object as any)[prop]}
                  onCheckedChange={(state) => setValue(object, prop, !!state)}
                />
              </Input.Root>
            )}
            {prop !== 'id' && type === 'string' && (
              <Input.Root>
                <Input.Label classNames={labelProps}>{prop}</Input.Label>
                <Editor object={object} prop={prop} />
              </Input.Root>
            )}
          </div>
        ))}
      </div>

      {/* TODO(burdon): Check if mutable. */}
      <div className='flex flex-col shrink-0'>
        <Button variant='ghost' classNames='p-0' onClick={() => onDelete(object.id)}>
          <X />
        </Button>
      </div>
    </div>
  );
};

const Editor = ({ object, prop }: { object: ReactiveObject<any>; prop: string }) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      doc: object[prop],
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions({ themeMode }),
        createThemeExtensions({ themeMode, slots: { content: { className: '!p-0' } } }),
        automerge(createDocAccessor(object, [prop])),
      ],
    };
  }, []);

  return <div ref={parentRef} className='grow' />;
};

// TODO(burdon): Add metadata.
export const DebugItem = ({ object, onDelete }: Pick<ItemProps<ReactiveObject<any>>, 'object' | 'onDelete'>) => {
  const meta = getMeta(object);
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
