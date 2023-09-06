//
// Copyright 2023 DXOS.org
//

import { Check, CaretDown, Trash, X } from '@phosphor-icons/react';
import React, { useRef, useState } from 'react';

import { Button, Input, Popover, Select, Toolbar } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { safeParseInt } from '@dxos/util';

import { GridSchema, GridSchemaColumn } from './schema';

export type ColumnMenuProps = {
  schema: GridSchema;
  column: GridSchemaColumn;
  onUpdate?: (id: string, column: GridSchemaColumn) => void;
  onDelete?: (id: string) => void;
};

export const ColumnMenu = ({ schema, column, onUpdate, onDelete }: ColumnMenuProps) => {
  const [open, setOpen] = useState(false);
  const [prop, setProp] = useState(column.id);
  const [type, setType] = useState(String(column.type));
  const [label, setLabel] = useState(column.label);
  const [digits, setDigits] = useState(String(column.digits ?? '0'));
  const propRef = useRef<HTMLInputElement>(null);

  const handleCancel = () => {
    setProp(column.id);
    setOpen(false);
  };

  const handleSave = () => {
    // Check valid and unique.
    if (
      !prop.length ||
      !prop.match(/^[a-zA-Z_].+/i) ||
      schema.columns.find((c) => c.id !== column.id && c.id === prop)
    ) {
      propRef.current?.focus();
      return;
    }

    onUpdate?.(column.id, {
      ...column,
      id: prop,
      type: type as GridSchemaColumn['type'],
      label,
      digits: safeParseInt(digits),
    });

    setOpen(false);
  };

  // TODO(burdon): Allow blank label (different from undefined).
  const title = column.label?.length ? column.label : column.id;

  return (
    <div className='flex grow items-center overflow-hidden'>
      <div className='truncate' title={title}>
        {title}
      </div>
      <div className='grow' />

      {/* TODO(burdon): Click away to close? */}
      <div className='flex shrink-0'>
        <Popover.Root open={open}>
          <Popover.Trigger asChild>
            <Button variant='ghost' classNames='p-0' onClick={() => setOpen(true)}>
              <CaretDown className={getSize(4)} />
            </Button>
          </Popover.Trigger>
          <Popover.Content>
            <Popover.Viewport classNames='flex flex-col p-4 gap-4'>
              <div className='flex flex-col gap-2'>
                <div className='flex items-center'>
                  <Input.Root>
                    <Input.Label classNames='w-24'>Label</Input.Label>
                    <Input.TextInput
                      value={label}
                      placeholder='Enter label'
                      onChange={(event) => setLabel(event.target.value)}
                      autoFocus
                    />
                  </Input.Root>
                </div>
                <div className='flex items-center'>
                  <Input.Root>
                    <Input.Label classNames='w-24'>Property</Input.Label>
                    <Input.TextInput
                      ref={propRef}
                      value={prop}
                      placeholder='Enter property key'
                      // TODO(burdon): Provide hooks for value normalization, ENTER, ESC, etc.
                      onChange={(event) => setProp(event.target.value.replace(/[^\w_]/g, ''))}
                    />
                  </Input.Root>
                </div>
                <div className='flex items-center'>
                  <Input.Root>
                    <Input.Label classNames='w-24'>Type</Input.Label>
                    <Input.TextInput value={type} onChange={(event) => setType(event.target.value)} />
                  </Input.Root>
                </div>
                {type === 'number' && (
                  <div className='flex items-center'>
                    {/* TODO(burdon): Constrain input to numbers. */}
                    <Input.Root>
                      <Input.Label classNames='w-24'>Digits</Input.Label>
                      <Input.TextInput value={digits} onChange={(event) => setDigits(event.target.value)} />
                    </Input.Root>
                  </div>
                )}

                {/* TODO(burdon): Error: `RovingFocusGroupItem` must be used within `RovingFocusGroup`. */}
                {false && (
                  <Select.Root>
                    <Toolbar.Button asChild>
                      <Select.TriggerButton placeholder='Type' />
                    </Toolbar.Button>
                    <Select.Portal>
                      <Select.Content>
                        <Select.Viewport>
                          {/* TODO(burdon): Map values. */}
                          <Select.Option value={'string'}>String</Select.Option>
                          <Select.Option value={'boolean'}>Boolean</Select.Option>
                          <Select.Option value={'number'}>Number</Select.Option>
                          <Select.Option value={'date'}>Date</Select.Option>
                        </Select.Viewport>
                      </Select.Content>
                    </Select.Portal>
                  </Select.Root>
                )}
              </div>

              {/* TODO(burdon): Style as DropdownMenuItem. */}
              <div className='flex flex-col gap-2'>
                <Button classNames='flex justify-start items-center gap-2' onClick={handleSave}>
                  <Check className={getSize(5)} />
                  <span>Save</span>
                </Button>
                <Button classNames='flex justify-start items-center gap-2' onClick={handleCancel}>
                  <X className={getSize(5)} />
                  <span>Cancel</span>
                </Button>
                <Button classNames='flex justify-start items-center gap-2' onClick={() => onDelete?.(column.id)}>
                  <Trash className={getSize(5)} />
                  <span>Delete</span>
                </Button>
              </div>
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Root>
      </div>
    </div>
  );
};
