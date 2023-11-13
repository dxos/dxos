//
// Copyright 2023 DXOS.org
//

import { useFocusFinders } from '@fluentui/react-tabster';
import { Check, ClipboardText, type Icon, X } from '@phosphor-icons/react';
import { createColumnHelper, type ColumnDef, type ColumnMeta, type RowData } from '@tanstack/react-table';
import format from 'date-fns/format';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import defaultsDeep from 'lodash.defaultsdeep';
import React, { useCallback, useRef, useState } from 'react';

import { type PublicKey } from '@dxos/keys';
import { Input, Popover, Tooltip } from '@dxos/react-ui';
import { SearchList } from '@dxos/react-ui-searchlist';
import { descriptionText, getSize, mx } from '@dxos/react-ui-theme';
import { stripUndefinedValues } from '@dxos/util';

// TODO(burdon): Factor out hack to find next focusable element (extend useFocusFinders)?
const findNextFocusable = (
  findFirstFocusable: (container: HTMLElement) => HTMLElement | null | undefined,
  container: HTMLElement,
): HTMLElement | undefined => {
  const next = findFirstFocusable(container as any);
  if (next) {
    if (next?.tagName === 'INPUT') {
      return next;
    }
    if (container.nextElementSibling) {
      return findNextFocusable(findFirstFocusable, container.nextSibling as any);
    }
  }
};

export type ValueUpdater<TData extends RowData, TValue> = (row: TData, id: string, value: TValue) => void;

export const createColumnBuilder = <TData extends RowData>() => ({
  helper: createColumnHelper<TData>(),
  builder: new ColumnBuilder<TData>(),
});

/**
 * NOTE: Can use `meta` for custom properties.
 */
export type BaseColumnOptions<TData, TValue> = Partial<ColumnDef<TData, TValue>> & {
  meta?: ColumnMeta<TData, TValue>;
  label?: string;
  className?: string;
  onUpdate?: ValueUpdater<TData, TValue | undefined>;
};

// TODO(burdon): Better abstraction?
export type SelectQueryModel<TData extends RowData> = {
  getId(object: TData): string;
  getText(object: TData): string;
  query(text?: string): Promise<TData[]>;
};

export type SelectColumnOptions<TData extends RowData> = BaseColumnOptions<TData, any> & {
  model: SelectQueryModel<TData>;
};

export type StringColumnOptions<TData extends RowData> = BaseColumnOptions<TData, string> & {};

export type NumberColumnOptions<TData extends RowData> = BaseColumnOptions<TData, number> & {
  digits?: number;
};

export type KeyColumnOptions<TData extends RowData> = BaseColumnOptions<TData, PublicKey> & {
  tooltip?: boolean;
};

export type DateColumnOptions<TData extends RowData> = BaseColumnOptions<TData, Date> & {
  format?: string;
  relative?: boolean;
};

export type BooleanColumnOptions<TData extends RowData> = BaseColumnOptions<TData, boolean> & {};

export type IconColumnOptions<TData extends RowData> = BaseColumnOptions<TData, boolean> & {
  on?: {
    Icon?: Icon;
    className?: string;
  };
  off?: {
    Icon?: Icon;
    className?: string;
  };
};

const defaults = <TData extends RowData, TValue>(
  options: Partial<ColumnDef<TData, TValue>>,
  ...sources: Partial<ColumnDef<TData, TValue>>[]
): Partial<ColumnDef<TData, TValue>> => {
  return stripUndefinedValues(defaultsDeep({}, options, ...sources));
};

type CellSelectorItems<TData extends RowData> = Record<string, { label: string; data: TData }>;

const initialItems = <TData extends RowData>(model: SelectQueryModel<TData>, value?: TData) =>
  value
    ? {
        [model.getId(value)]: { label: model.getText(value), data: value },
      }
    : {};

const CellSelector = <TData extends RowData>({
  model,
  value,
  onValueChange,
}: {
  model: SelectQueryModel<TData>;
  value: TData;
  onValueChange: (value: TData) => void;
}) => {
  const [items, setItems] = useState<CellSelectorItems<TData>>(initialItems(model, value));
  const [loading, setLoading] = useState(false);
  const [searchInputValue, setSearchInputValue] = useState('');
  const handleSearchInputValueChange = async (text?: string) => {
    setSearchInputValue(text ?? '');
    setLoading(true);
    const items = await model.query(text);
    setItems(
      items.reduce((acc: CellSelectorItems<TData>, item) => {
        acc[model.getId(item)] = {
          label: model.getText(item),
          data: item,
        };
        return acc;
      }, initialItems(model, value)),
    );
    setLoading(false);
  };

  const handleValueChange = useCallback(
    (id: string) => {
      onValueChange(items[id]?.data);
    },
    [items, onValueChange],
  );

  return (
    <Popover.Root>
      <Popover.Trigger>Open</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side='bottom' collisionPadding={48} classNames='is-60'>
          <SearchList.Root shouldFilter={false}>
            <SearchList.Input value={searchInputValue} onValueChange={handleSearchInputValueChange} />
            <Popover.Viewport>
              <SearchList.Content>
                {searchInputValue.length < 1 ? (
                  <p className={mx('text-center', descriptionText)}>Start typing to search</p>
                ) : loading ? (
                  <p className={mx('text-center', descriptionText)}>Searching…</p>
                ) : (
                  <>
                    <SearchList.Empty classNames={['text-center', descriptionText]}>No results</SearchList.Empty>
                    {Object.entries(items).map(([id, { label }]) => (
                      <SearchList.Item key={id} value={id} onSelect={handleValueChange} classNames='truncate'>
                        {label}
                      </SearchList.Item>
                    ))}
                  </>
                )}
              </SearchList.Content>
            </Popover.Viewport>
          </SearchList.Root>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

/**
 * Util to create column definitions.
 */
export class ColumnBuilder<TData extends RowData> {
  /**
   * Select value
   */
  select({ label, className, model, onUpdate, ...props }: SelectColumnOptions<TData>): Partial<ColumnDef<TData, any>> {
    return defaults(props, {
      minSize: 100,
      header: (column) => {
        return <div className={'truncate'}>{label ?? column.header.id}</div>;
      },
      cell:
        model && onUpdate
          ? (cell) => (
              <CellSelector<any>
                model={model}
                value={cell.getValue()}
                onValueChange={(value) => onUpdate?.(cell.row.original, cell.column.id, value)}
              />
            )
          : (cell) => {
              const value = cell.getValue();
              return <div className={mx('truncate', className)}>{value ? model.getText(value) : ''}</div>;
            },
    });
  }

  /**
   * String formats.
   */
  string({ label, className, onUpdate, ...props }: StringColumnOptions<TData> = {}): Partial<ColumnDef<TData, string>> {
    return defaults(props, {
      minSize: 100,
      // TODO(burdon): Default.
      header: (column) => {
        return <div className={'truncate'}>{label ?? column.header.id}</div>;
      },
      cell: onUpdate
        ? (cell) => {
            // https://tanstack.com/table/v8/docs/examples/react/editable-data
            const initialValue = cell.getValue();
            const [value, setValue] = useState(initialValue);
            const inputRef = useRef<HTMLInputElement>(null);
            const { findFirstFocusable } = useFocusFinders();

            const handleSave = (focusNext = false) => {
              if (value === initialValue) {
                return;
              }

              onUpdate?.(cell.row.original, cell.column.id, value);

              // TODO(burdon): More generally support keyboard navigation.
              if (focusNext) {
                const rowElement = inputRef.current?.parentElement?.parentElement;
                // TODO(burdon): Hack to wait for next row to render.
                setTimeout(() => {
                  const next = findNextFocusable(findFirstFocusable, rowElement as HTMLElement);
                  next?.focus();
                });
              }
            };

            const handleCancel = () => {
              setValue(initialValue);
            };

            // Check if first input column of last row.
            const rows = cell.table.getRowModel().flatRows;
            const columns = cell.table.getVisibleFlatColumns();
            const placeholder = cell.row.index === rows.length - 1 && columns[0].id === cell.column.id;

            // TODO(burdon): Don't render inputs unless mouse over (Show ellipsis when div)?
            return (
              <Input.Root>
                <Input.TextInput
                  ref={inputRef}
                  variant='subdued'
                  placeholder={placeholder ? 'Add row...' : undefined}
                  classNames={'px-2'}
                  value={(value as string) ?? ''}
                  onBlur={() => handleSave(false)}
                  onChange={(event) => setValue(event.target.value)}
                  onKeyDown={(event) =>
                    (event.key === 'Enter' && handleSave(true)) || (event.key === 'Escape' && handleCancel())
                  }
                />
              </Input.Root>
            );
          }
        : (cell) => {
            const value = cell.getValue();
            return <div className={mx('truncate', className)}>{value}</div>;
          },
    });
  }

  /**
   * Number formats.
   */
  number({ label, minSize, className, digits, onUpdate, ...props }: NumberColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, number>
  > {
    return defaults(props, {
      size: 100,
      minSize: 100,
      header: (cell) => <div className='w-full truncate text-right'>{label ?? cell.header.id}</div>,
      cell: (cell) => {
        const value = cell.getValue();
        const [text, setText] = useState<string>();

        const handleEdit = () => {
          if (onUpdate) {
            setText(value !== undefined ? String(value) : '');
          }
        };

        // TODO(burdon): Property is encoded as float (e.g., 6.1 => 6.099)
        const handleSave = () => {
          const value = text?.trim().length ? Number(text) : NaN;
          onUpdate?.(cell.row.original, cell.column.id, isNaN(value) ? undefined : value);
          setText(undefined);
        };

        const handleCancel = () => {
          setText(undefined);
        };

        if (text !== undefined) {
          return (
            <div className={mx('grow text-right font-mono', className)}>
              <Input.Root>
                <Input.TextInput
                  autoFocus
                  value={text}
                  classNames={'px-2'}
                  onBlur={handleSave}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) =>
                    (event.key === 'Escape' && handleCancel()) || (event.key === 'Enter' && handleSave())
                  }
                />
              </Input.Root>
            </div>
          );
        }

        return (
          <div
            className={mx('grow w-full text-right font-mono empty:after:content-[" "]', className)}
            onClick={handleEdit}
          >
            {value?.toLocaleString(undefined, {
              minimumFractionDigits: digits ?? 0,
              maximumFractionDigits: digits ?? 2,
            })}
          </div>
        );
      },
    });
  }

  /**
   * Date formats.
   */
  // TODO(burdon): Date picker (pluggable renderers?)
  date({ label, format: formatSpec, relative, className, ...props }: DateColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, Date>
  > {
    return defaults(props, {
      size: 220, // TODO(burdon): Depends on format.
      minSize: 100,
      header: (cell) => <div>{label ?? cell.header.id}</div>,
      cell: (cell) => {
        const value = cell.getValue();

        try {
          const str = value
            ? formatSpec
              ? format(value, formatSpec)
              : relative
              ? formatDistanceToNow(value, { addSuffix: true })
              : value.toISOString()
            : undefined;

          return <div className={mx('font-mono', className)}>{str}</div>;
        } catch (err) {
          console.log(value);
          return null;
        }
      },
    });
  }

  /**
   * PublicKey with tooltip.
   */
  key({ label, tooltip, ...props }: KeyColumnOptions<TData> = {}): Partial<ColumnDef<TData, PublicKey>> {
    return defaults(props, {
      size: 86,
      minSize: 86,
      header: (cell) => <div>{label ?? cell.header.id}</div>,
      cell: (cell) => {
        const value = cell.getValue();
        if (!value) {
          return;
        }

        // TODO(burdon): Factor out styles.
        const element = (
          <div className='font-mono font-thin text-green-500 dark:text-green-300'>{value.truncate()}</div>
        );
        if (!tooltip) {
          return element;
        }

        return (
          <div className='group inline-flex gap-2 items-center'>
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>{element}</Tooltip.Trigger>
                <Tooltip.Content side='right'>
                  <Tooltip.Arrow />
                  <ClipboardText
                    onClick={(ev) => {
                      ev.stopPropagation(); // Prevent select row.
                      void navigator.clipboard.writeText(value.toHex());
                    }}
                  />
                </Tooltip.Content>
              </Tooltip.Root>
            </Tooltip.Provider>
          </div>
        );
      },
    });
  }

  /**
   * Checkbox.
   */
  checkbox({ label, className, onUpdate, ...props }: BooleanColumnOptions<TData> = {}): Partial<
    ColumnDef<TData, boolean>
  > {
    return defaults(props, {
      size: 40,
      minSize: 40,
      header: (column) => <div className={'flex grow justify-center'}>{label ?? column.header.id}</div>,
      cell: (cell) => {
        const value = cell.getValue();
        // TODO(burdon): Center.
        return (
          <div className='flex grow justify-center'>
            <Input.Root>
              <Input.Checkbox
                onClick={(event) => event.stopPropagation()}
                classNames={className}
                disabled={!onUpdate}
                checked={!!value}
                onCheckedChange={(value) => {
                  onUpdate?.(cell.row.original, cell.column.id, !!value);
                }}
              />
            </Input.Root>
          </div>
        );
      },
    });
  }

  /**
   * Icon based on boolean value.
   */
  icon({ label, size, on, off, ...props }: IconColumnOptions<TData> = {}): Partial<ColumnDef<TData, boolean>> {
    const IconOn = on?.Icon ?? Check;
    const IconOff = off?.Icon ?? X;
    return defaults(props, {
      size: size ?? 32,
      header: (column) => <div className={'justify-center'}>{label ?? column.header.id}</div>,
      cell: (cell) => {
        const value = cell.getValue();
        if (value) {
          return (
            <div className='flex grow justify-center'>
              <IconOn className={mx(getSize(6), on?.className ?? 'text-green-700')} />
            </div>
          );
        } else if (value === false) {
          return (
            <div className='flex grow justify-center'>
              <IconOff className={mx(getSize(6), off?.className ?? 'text-red-700')} />
            </div>
          );
        } else {
          return null;
        }
      },
    });
  }
}
