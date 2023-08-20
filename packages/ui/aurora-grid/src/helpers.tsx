//
// Copyright 2023 DXOS.org
//

import { Check, ClipboardText, X } from '@phosphor-icons/react';
import { RowData } from '@tanstack/react-table';
import format from 'date-fns/format';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import defaultsDeep from 'lodash.defaultsdeep';
import React from 'react';

import { Tooltip } from '@dxos/aurora';
import { chromeSurface, groupSurface } from '@dxos/aurora-theme';
import { PublicKey } from '@dxos/keys';

import { GridColumn, GridSlots } from './Grid';

// TODO(burdon): Create builder (with default styles; e.g., padding, font-size).

export const createColumn = <TData extends RowData, TValue>(
  id: string,
  ...props: (Partial<GridColumn<TData, TValue>> | undefined)[]
): GridColumn<TData, TValue> => defaultsDeep({ id }, ...props, { header: { label: id } });

export const createTextColumn = <TData extends RowData>(
  id: string,
  props?: Partial<GridColumn<TData, string>>,
): GridColumn<TData, string> => createColumn(id, props);

type DateFormatOptions = {
  format?: string;
  relative?: boolean;
};

export const createDateColumn = <TData extends RowData>(
  id: string,
  options?: DateFormatOptions, // TODO(burdon): Make optional? Multi method defs?
  props?: Partial<GridColumn<TData, Date>>,
): GridColumn<TData, Date> =>
  createColumn(id, props, {
    cell: {
      render: ({ value }) =>
        options?.format
          ? format(value, options.format)
          : options?.relative
          ? formatDistanceToNow(value, { addSuffix: true })
          : value.toISOString(),
      className: 'font-mono',
    },
  });

export const createNumberColumn = <TData extends RowData>(
  id: string,
  props?: Partial<GridColumn<TData, number>>,
): GridColumn<TData, number> =>
  createColumn(id, props, {
    header: {
      className: 'font-mono text-right',
    },
    cell: {
      render: ({ value }) => value?.toLocaleString(),
      className: 'font-mono text-right',
    },
  });

// TODO(burdon): Make tooltip optional for all columns?
export const createKeyColumn = <TData extends RowData>(
  id: string,
  props?: Partial<GridColumn<TData, PublicKey>>,
): GridColumn<TData, PublicKey> =>
  createColumn(id, props, {
    width: 86,
    cell: {
      render: ({ value }) => {
        if (!value) {
          return null;
        }

        return (
          <div className='group inline-flex gap-2 items-center'>
            <Tooltip.Provider>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  {/* TODO(burdon): Factor out styles. */}
                  <span className='font-mono font-thin text-green-500'>{value.truncate()}</span>
                </Tooltip.Trigger>
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
    },
  });

// TODO(burdon): Option for icons.
export const createBooleanColumn = <TData extends RowData>(
  id: string,
  props?: Partial<GridColumn<TData, boolean>>,
): GridColumn<TData, boolean> =>
  createColumn(id, props, {
    width: 24,
    cell: {
      render: ({ value }) =>
        value ? <Check className='text-green-700' /> : !value ? <X className='text-red-700' /> : null,
    },
  });

// TODO(burdon): Move to theme?
export const defaultGridSlots: GridSlots = {
  root: { className: chromeSurface },
  header: { className: [groupSurface, 'p-1 text-left font-thin opacity-90'] },
  footer: { className: [groupSurface, 'p-1 text-left font-thin opacity-90'] },
  cell: { className: 'p-1' },
  row: { className: 'cursor-pointer hover:bg-zinc-100' },
  focus: { className: 'ring-1 ring-teal-500 ring-inset' },
  selected: { className: '!bg-teal-100' },
  margin: { style: { width: 8 } },
};
