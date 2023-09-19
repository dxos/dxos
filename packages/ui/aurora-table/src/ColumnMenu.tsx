//
// Copyright 2023 DXOS.org
//

import { Check, CaretDown, Trash, X } from '@phosphor-icons/react';
import { HeaderContext, RowData } from '@tanstack/react-table';
import React, { FC, PropsWithChildren, useRef, useState } from 'react';

import { Button, DensityProvider, Input, Popover, Select, useId } from '@dxos/aurora';
import { getSize, mx } from '@dxos/aurora-theme';
import { safeParseInt } from '@dxos/util';

import { TableSchema, TableSchemaProp } from './schema';

const types = new Map<TableSchemaProp['type'], string>([
  ['string', 'Text'],
  ['boolean', 'Checkbox'],
  ['number', 'Number'],
  ['date', 'Date'],
  ['ref', 'Reference'],
]);

export type ColumnMenuProps<TData extends RowData, TValue> = {
  context: HeaderContext<TData, TValue>;
  schemas: TableSchema[];
  schema: TableSchema;
  column: TableSchemaProp;
  onUpdate?: (id: string, column: TableSchemaProp) => void;
  onDelete?: (id: string) => void;
};

export const ColumnMenu = <TData extends RowData, TValue>({ column, ...props }: ColumnMenuProps<TData, TValue>) => {
  const title = column.label?.length ? column.label : column.id;

  return (
    <div className='flex grow items-center overflow-hidden'>
      <div className='truncate' title={title}>
        {title}
      </div>
      <div className='grow' />
      <div className='flex shrink-0'>
        <ColumnPanel {...props} column={column} />
      </div>
    </div>
  );
};

export const ColumnPanel = <TData extends RowData, TValue>({
  context,
  schemas,
  schema,
  column,
  onUpdate,
  onDelete,
}: ColumnMenuProps<TData, TValue>) => {
  const typeSelectId = useId('columnMenu__type');
  const [open, setOpen] = useState(false);
  const [prop, setProp] = useState(column.id);
  const [refSchema, setRefSchema] = useState(column.ref);
  const [refProp, setRefProp] = useState(column.refProp);
  const [type, setType] = useState(String(column.type));
  const [label, setLabel] = useState(column.label);
  const [digits, setDigits] = useState(String(column.digits ?? '0'));
  const propRef = useRef<HTMLInputElement>(null);

  const handleCancel = () => {
    setProp(column.id);
    setOpen(false);
  };

  const handleSave = () => {
    console.log('!!!!!!!!!!!');

    // Check valid and unique.
    if (!prop.length || !prop.match(/^[a-zA-Z_].+/i) || schema.props.find((c) => c.id !== column.id && c.id === prop)) {
      propRef.current?.focus();
      return;
    }

    onUpdate?.(column.id, {
      ...column,
      id: prop,
      type: type as TableSchemaProp['type'],
      label,
      digits: safeParseInt(digits),
      ref: refSchema,
      refProp,
    });

    setOpen(false);
  };

  const Section: FC<PropsWithChildren & { className?: string }> = ({ children, className }) => (
    <div role='none' className={mx('p-2', className)}>
      {children}
    </div>
  );

  return (
    <Popover.Root open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <Popover.Trigger asChild>
        <Button variant='ghost' classNames='p-0'>
          <CaretDown className={getSize(4)} />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Popover.Viewport classNames='w-60'>
            <DensityProvider density='fine'>
              <div className='flex flex-col space-y-1 divide-y'>
                <Section>
                  <Input.Root>
                    <Input.Label classNames='mbe-1'>Label</Input.Label>
                    <Input.TextInput
                      placeholder='Column label'
                      value={label}
                      onChange={(event) => setLabel(event.target.value)}
                      autoFocus
                    />
                  </Input.Root>
                  <Input.Root>
                    <Input.Label classNames='mbe-1 mbs-3'>Property</Input.Label>
                    <Input.TextInput
                      ref={propRef}
                      placeholder='Property key'
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
                            {Array.from(types.entries()).map(([type, label]) => (
                              <Select.Option key={type} value={type}>
                                {label}
                              </Select.Option>
                            ))}
                          </Select.Viewport>
                        </Select.Content>
                      </Select.Portal>
                    </Select.Root>
                  </Input.Root>
                </Section>

                {type === 'number' && (
                  <>
                    <Section>
                      <Input.Root>
                        <Input.Label classNames='mbe-1 mbs-3'>Decimal places</Input.Label>
                        {/* TODO(burdon): Constrain input to numbers. */}
                        <Input.TextInput value={digits} onChange={(event) => setDigits(event.target.value)} />
                      </Input.Root>
                    </Section>
                  </>
                )}

                {/* TODO(burdon): Selectors on same line. */}
                {type === 'ref' && (
                  <>
                    <Section>
                      <Input.Root>
                        <Input.Label classNames='mbe-1 mbs-3'>Table</Input.Label>
                        <Select.Root value={refSchema} onValueChange={setRefSchema}>
                          <Select.TriggerButton placeholder='Table' classNames='is-full' id={typeSelectId} />
                          <Select.Portal>
                            <Select.Content>
                              <Select.Viewport>
                                {schemas
                                  .filter((s) => s.id !== schema.id)
                                  .map(({ id, name }) => (
                                    <Select.Option key={id} value={id}>
                                      {name ?? id}
                                    </Select.Option>
                                  ))}
                              </Select.Viewport>
                            </Select.Content>
                          </Select.Portal>
                        </Select.Root>
                      </Input.Root>

                      {refSchema && (
                        <Input.Root>
                          <Input.Label classNames='mbe-1 mbs-3'>Table property</Input.Label>
                          <Select.Root value={refProp} onValueChange={setRefProp}>
                            <Select.TriggerButton placeholder='Property' classNames='is-full' id={typeSelectId} />
                            <Select.Portal>
                              <Select.Content>
                                <Select.Viewport>
                                  {schemas
                                    .find((schema) => schema.id === refSchema)
                                    ?.props.map(({ id, label }) => (
                                      <Select.Option key={id} value={id}>
                                        {label ?? id}
                                      </Select.Option>
                                    ))}
                                </Select.Viewport>
                              </Select.Content>
                            </Select.Portal>
                          </Select.Root>
                        </Input.Root>
                      )}
                    </Section>
                  </>
                )}

                <Section className='space-b-1.5'>
                  {/* TODO(burdon): Style as DropdownMenuItem. */}
                  <Button variant='primary' classNames='is-full flex gap-2' onClick={handleSave}>
                    <span>Save</span>
                    <div className='grow' />
                    <Check className={getSize(5)} />
                  </Button>
                  <Button classNames='is-full flex gap-2' onClick={handleCancel}>
                    <span>Cancel</span>
                    <div className='grow' />
                    <X className={getSize(5)} />
                  </Button>
                  <Button classNames='is-full flex gap-2' onClick={() => onDelete?.(column.id)}>
                    <span>Delete</span>
                    <div className='grow' />
                    <Trash className={getSize(5)} />
                  </Button>
                </Section>
              </div>
            </DensityProvider>
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};
