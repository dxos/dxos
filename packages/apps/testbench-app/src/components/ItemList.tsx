//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { createDocAccessor } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { IconButton, Input, useThemeContext } from '@dxos/react-ui';
import {
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx, subtleHover } from '@dxos/react-ui-theme';
import { mapSchemaToFields } from '@dxos/schema';

const MAX_RENDERED_COUNT = 80;

export type ItemListProps<T> = { objects: T[] } & Pick<ItemProps<T>, 'debug' | 'onDelete'>;

export const ItemList = ({ objects, debug, ...props }: ItemListProps<Obj.Any>) => {
  return (
    <div className='flex flex-col grow overflow-hidden'>
      <div className='flex flex-col overflow-y-auto pr-2'>
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

const labelProps = 'shrink-0 is-20 text-right text-primary-500 pli-2 plb-[2px]';

export type ItemProps<T> = {
  object: T;
  debug?: boolean;
  onDelete: (id: string) => void;
};

// TODO(burdon): Use ui list with key nav/selection.
// TODO(burdon): Toggle options to show deleted.
export const Item = ({ object, onDelete }: ItemProps<Obj.Any>) => {
  const schema = Obj.getSchema(object);
  if (!schema) {
    return <DebugItem object={object} onDelete={onDelete} />;
  }

  // TODO(burdon): Get additional metadata.
  const props = mapSchemaToFields(schema);

  // TODO(burdon): [API]: Type check?
  const getValue = (object: Obj.Any, prop: string) => (object as any)[prop];
  const setValue = (object: Obj.Any, prop: string, value: any) => ((object as any)[prop] = value);

  return (
    <div className={mx('flex m-1 p-2 border', subtleHover)}>
      <div className='flex flex-col grow overflow-hidden gap-2'>
        {props.map(({ property, type }) => (
          <div key={property} className='flex'>
            {/* TODO(burdon): Check if editable or meta prop (e.g., id). */}
            {property === 'id' && (
              <Input.Root>
                <Input.Label classNames={labelProps}>{property}</Input.Label>
                <div className='font-mono text-xs plb-1'>{getValue(object, property).slice(0, 8)}</div>
              </Input.Root>
            )}
            {type === 'boolean' && (
              <Input.Root>
                <Input.Label classNames={labelProps}>{property}</Input.Label>
                <Input.Checkbox
                  checked={(object as any)[property]}
                  onCheckedChange={(state) => setValue(object, property, !!state)}
                />
              </Input.Root>
            )}
            {property !== 'id' && type === 'string' && (
              <Input.Root>
                <Input.Label classNames={labelProps}>{property}</Input.Label>
                <Editor object={object} prop={property} />
              </Input.Root>
            )}
          </div>
        ))}
      </div>

      {/* TODO(burdon): Check if mutable. */}
      <div className='flex flex-col shrink-0'>
        <IconButton icon='ph--x--regular' iconOnly label='Delete' onClick={() => onDelete(object.id)} variant='ghost' />
      </div>
    </div>
  );
};

const Editor = ({ object, prop }: { object: Obj.Any; prop: string }) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(() => {
    return {
      initialValue: (object as any)[prop],
      extensions: [
        createBasicExtensions(),
        createMarkdownExtensions(),
        createThemeExtensions({ themeMode, slots: { content: { className: 'p-0' } } }),
        automerge(createDocAccessor(object, [prop])),
      ],
    };
  }, []);

  return <div ref={parentRef} className='grow' />;
};

// TODO(burdon): Add metadata.
export const DebugItem = ({ object, onDelete }: Pick<ItemProps<Obj.Any>, 'object' | 'onDelete'>) => {
  const meta = Obj.getMeta(object);
  const deleted = JSON.stringify(object).indexOf('@deleted') !== -1; // TODO(burdon): [API] Missing API.
  return (
    <div className='flex is-full pli-1.5 plb-1 text-sm font-thin font-mono'>
      <pre className='grow'>{JSON.stringify({ id: object.id.slice(0, 8), deleted, ...meta }, undefined, 2)}</pre>
      <IconButton icon='ph--x--regular' variant='ghost' iconOnly onClick={() => onDelete(object.id)} label='Delete' />
    </div>
  );
};
