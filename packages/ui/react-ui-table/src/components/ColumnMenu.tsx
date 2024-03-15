//
// Copyright 2023 DXOS.org
//

import { Check, Trash, X, GearSix } from '@phosphor-icons/react';
import { type HeaderContext, type RowData } from '@tanstack/react-table';
import React, { type FC, type PropsWithChildren, useRef, useState } from 'react';

import { Button, DensityProvider, Input, Popover, Select, Separator, useTranslation } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { safeParseInt } from '@dxos/util';

import { SortButton } from './SortButton';
import { type TableDef, type ColumnProps, type ColumnType } from '../schema';
import { translationKey } from '../translations';

export type ColumnMenuProps<TData extends RowData, TValue> = {
  context: HeaderContext<TData, TValue>;
  tableDefs: TableDef[];
  tableDef: TableDef;
  column: ColumnProps;
  onUpdate?: (id: string, column: ColumnProps) => void;
  onDelete?: (id: string) => void;
};

export const ColumnMenu = <TData extends RowData, TValue>({ column, ...props }: ColumnMenuProps<TData, TValue>) => {
  const title = column.label?.length ? column.label : column.id;

  const header = props.context.header;

  const canSort = header.column.getCanSort();
  const sortDirection = header.column.getIsSorted();
  const toggleSort = header.column.getToggleSortingHandler();

  return (
    <div className='flex items-center gap-2'>
      <div className='flex-1 min-is-0 truncate' title={title}>
        {title}
      </div>
      <div className='flex gap-0'>
        {canSort && toggleSort && <SortButton sortDirection={sortDirection} onClick={toggleSort} />}
        <ColumnPanel {...props} column={column} />
      </div>
    </div>
  );
};

const Section: FC<PropsWithChildren & { className?: string }> = ({ children, className }) => (
  <div role='none' className={mx('p-2', className)}>
    {children}
  </div>
);

export const ColumnPanel = <TData extends RowData, TValue>({
  context,
  tableDefs,
  tableDef,
  column,
  onUpdate,
  onDelete,
}: ColumnMenuProps<TData, TValue>) => {
  const [open, setOpen] = useState(false);
  const [prop, setProp] = useState(column.id);
  const [refTable, setRefTable] = useState(column.refTable);
  const [refProp, setRefProp] = useState(column.refProp);
  const [type, setType] = useState(String(column.type));
  const [label, setLabel] = useState(column.label);
  const [digits, setDigits] = useState(String(column.digits ?? '0'));
  const propRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation(translationKey);

  const handleCancel = () => {
    setProp(column.id);
    setOpen(false);
  };

  const handleSave = () => {
    // Check valid.
    if (!prop.length || !prop.match(/^[a-zA-Z_].+/i)) {
      propRef.current?.focus();
      return;
    }

    // If already exists then check same type.
    const current = tableDef.columns.find((c) => c.id !== column.id && c.id === prop);
    if (current) {
      // TODO(burdon): Allow multiple columns with different refProps. Ensure correct table prop is updated.
      if (current.type !== 'ref' /* || current.ref !== refTable */) {
        // TODO(burdon): Show error.
        propRef.current?.focus();
        return;
      }
    }

    onUpdate?.(prop, {
      id: prop, // TODO(burdon): Make unique.
      prop,
      label,
      type: type as ColumnProps['type'],
      refTable,
      refProp,
      digits: safeParseInt(digits),
    });

    setOpen(false);
  };

  return (
    <Popover.Root open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
      <Popover.Trigger asChild>
        <Button variant='ghost'>
          <GearSix className={mx(getSize(4), 'rotate-90')} />
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Popover.Viewport classNames='w-60'>
            <DensityProvider density='fine'>
              <div className='flex flex-col gap-1'>
                <Section>
                  <Input.Root>
                    <Input.Label classNames='mbe-1'>{t('column label label')}</Input.Label>
                    <Input.TextInput
                      placeholder='Column label'
                      value={label ?? ''}
                      onChange={(event) => setLabel(event.target.value)}
                      autoFocus
                    />
                  </Input.Root>
                  <Input.Root>
                    <Input.Label classNames='mbe-1 mbs-3'>{t('property key label')}</Input.Label>
                    <Input.TextInput
                      ref={propRef}
                      placeholder='Property key'
                      // TODO(burdon): Provide hooks for value normalization, ENTER, ESC, etc.
                      value={prop ?? ''}
                      onChange={(event) => setProp(event.target.value.replace(/[^\w_]/g, ''))}
                    />
                  </Input.Root>
                  <Input.Root>
                    <Input.Label classNames='mbe-1 mbs-3'>{t('column type label')}</Input.Label>
                    <Select.Root value={type} onValueChange={setType}>
                      <Select.TriggerButton placeholder='Type' classNames='is-full' />
                      <Select.Portal>
                        <Select.Content>
                          <Select.Viewport>
                            {(['number', 'boolean', 'string', 'ref'] as ColumnType[]).map((type) => (
                              <Select.Option key={type} value={type}>
                                {t(`${type} column type label`)}
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
                        <Input.Label classNames='mbe-1 mbs-3'>{t('digits label')}</Input.Label>
                        {/* TODO(burdon): Constrain input to numbers. */}
                        <Input.TextInput value={digits ?? ''} onChange={(event) => setDigits(event.target.value)} />
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
                        <Select.Root value={refTable} onValueChange={setRefTable}>
                          <Select.TriggerButton placeholder='Table' classNames='is-full' />
                          <Select.Portal>
                            <Select.Content>
                              <Select.Viewport>
                                {tableDefs
                                  .filter((t) => t.id !== tableDef.id)
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

                      {refTable && (
                        <Input.Root>
                          <Input.Label classNames='mbe-1 mbs-3'>Table property</Input.Label>
                          <Select.Root value={refProp} onValueChange={setRefProp}>
                            <Select.TriggerButton placeholder='Property' classNames='is-full' />
                            <Select.Portal>
                              <Select.Content>
                                <Select.Viewport>
                                  {tableDefs
                                    .find((tableDef) => tableDef.id === refTable)
                                    ?.columns.map(({ id, label }) => (
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

                <Separator classNames='mli-2' />

                <Section className='space-b-1.5'>
                  {/* TODO(burdon): Style as DropdownMenuItem. */}
                  <Button variant='primary' classNames='is-full flex gap-2' onClick={handleSave}>
                    <span>{t('save label')}</span>
                    <div className='grow' />
                    <Check className={getSize(5)} />
                  </Button>
                  <Button classNames='is-full flex gap-2' onClick={handleCancel}>
                    <span>{t('cancel label', { ns: 'os' })}</span>
                    <div className='grow' />
                    <X className={getSize(5)} />
                  </Button>
                  <Button classNames='is-full flex gap-2' onClick={() => onDelete?.(column.id)}>
                    <span>{t('delete label')}</span>
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
