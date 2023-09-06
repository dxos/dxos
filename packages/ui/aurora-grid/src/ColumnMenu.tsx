//
// Copyright 2023 DXOS.org
//

import { Check, CaretDown, Trash, X } from '@phosphor-icons/react';
import { HeaderContext, RowData } from '@tanstack/react-table';
import React, { useRef, useState } from 'react';

import { Button, DensityProvider, Input, Popover, Select, Separator, useId } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { safeParseInt } from '@dxos/util';

import { GridSchema, GridSchemaColumn } from './schema';

const types = [
  { type: 'string', label: 'Text' },
  { type: 'boolean', label: 'Checkbox' },
  { type: 'number', label: 'Number' },
  { type: 'date', label: 'Date' },
];

export type ColumnMenuProps<TData extends RowData, TValue> = {
  context: HeaderContext<TData, TValue>;
  schema: GridSchema;
  column: GridSchemaColumn;
  onUpdate?: (id: string, column: GridSchemaColumn) => void;
  onDelete?: (id: string) => void;
};

export const ColumnMenu = <TData extends RowData, TValue>({
  context,
  schema,
  column,
  onUpdate,
  onDelete,
}: ColumnMenuProps<TData, TValue>) => {
  const [open, setOpen] = useState(false);
  const [prop, setProp] = useState(column.id);
  const [type, setType] = useState(String(column.type));
  const [label, setLabel] = useState(column.label);
  const [digits, setDigits] = useState(String(column.digits ?? '0'));
  const propRef = useRef<HTMLInputElement>(null);
  const typeSelectId = useId('columnMenu__type');

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

      <div className='flex shrink-0'>
        <Popover.Root open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
          <Popover.Trigger asChild>
            <Button variant='ghost' classNames='p-0'>
              <CaretDown className={getSize(4)} />
            </Button>
          </Popover.Trigger>

          <Popover.Portal>
            <Popover.Content>
              <Popover.Viewport classNames='p-3'>
                <DensityProvider density='fine'>
                  <Input.Root>
                    <Input.Label classNames='mbe-1'>Label</Input.Label>
                    <Input.TextInput
                      placeholder='Enter label'
                      value={label}
                      onChange={(event) => setLabel(event.target.value)}
                      autoFocus
                    />
                  </Input.Root>
                  <Input.Root>
                    <Input.Label classNames='mbe-1 mbs-3'>Property</Input.Label>
                    <Input.TextInput
                      ref={propRef}
                      placeholder='Enter property key'
                      // TODO(burdon): Provide hooks for value normalization, ENTER, ESC, etc.
                      value={prop}
                      onChange={(event) => setProp(event.target.value.replace(/[^\w_]/g, ''))}
                    />
                  </Input.Root>
                  <Input.Root id={typeSelectId}>
                    <Input.Label classNames='mbe-1 mbs-3'>Type</Input.Label>
                    <Select.Root value={type} onValueChange={setType}>
                      <Select.TriggerButton placeholder='Type' classNames='is-full' id={typeSelectId} />
                      <Select.Portal>
                        <Select.Content>
                          <Select.Viewport>
                            {types.map(({ type, label }) => (
                              <Select.Option key={type} value={type}>
                                {label}
                              </Select.Option>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </Input.Root>
                  {type === 'number' && (
                    <Input.Root>
                      <Input.Label classNames='mbe-1 mbs-3'>Decimal places</Input.Label>
                      {/* TODO(burdon): Constrain input to numbers. */}
                      <Input.TextInput value={digits} onChange={(event) => setDigits(event.target.value)} />
                    </Input.Root>
                  )}

                  <Separator orientation='horizontal' classNames='mlb-3' />
                  <div role='none' className='space-b-1.5'>
                    {/* TODO(burdon): Style as DropdownMenuItem. */}
                    <Button variant='primary' classNames='is-full flex gap-2' onClick={handleSave}>
                      <span>Save</span>
                      <Check className={getSize(5)} />
                    </Button>
                    <Button classNames='is-full flex gap-2' onClick={handleCancel}>
                      <span>Cancel</span>
                      <X className={getSize(5)} />
                    </Button>
                    <Button classNames='is-full flex gap-2' onClick={() => onDelete?.(column.id)}>
                      <span>Delete</span>
                      <Trash className={getSize(5)} />
                    </Button>
                  </div>
                </DensityProvider>
              </Popover.Viewport>
              <Popover.Arrow />
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      </div>
    </div>
  );
};
