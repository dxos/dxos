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

// TODO(burdon): Create builder (with default styles).

export const createColumn = <TData extends RowData, TValue>(
  key: string,
  ...props: (Partial<GridColumn<TData, TValue>> | undefined)[]
): GridColumn<TData, TValue> => defaultsDeep({ key }, ...props);

export const createTextColumn = <TData extends RowData>(
  key: string,
  props?: Partial<GridColumn<TData, string>>,
): GridColumn<TData, string> => createColumn(key, props);

type DateOptions = {
  format?: string;
  relative?: boolean;
};

export const createDateColumn = <TData extends RowData>(
  key: string,
  options?: DateOptions, // TODO(burdon): Make optional?
  props?: Partial<GridColumn<TData, Date>>,
): GridColumn<TData, Date> =>
  createColumn(key, props, {
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
  key: string,
  props?: Partial<GridColumn<TData, number>>,
): GridColumn<TData, number> =>
  createColumn(key, props, {
    header: {
      className: 'font-mono text-right',
    },
    cell: {
      render: ({ value }) => value?.toLocaleString(),
      className: 'font-mono text-right',
    },
  });

export const createKeyColumn = <TData extends RowData>(
  key: string,
  props?: Partial<GridColumn<TData, PublicKey>>,
): GridColumn<TData, PublicKey> =>
  createColumn(key, props, {
    width: 86,
    cell: {
      render: ({ value }) => (
        <div className='group inline-flex gap-2 items-center'>
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
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
      ),
    },
  });

export const createCheckColumn = <TData extends RowData>(
  key: string,
  props?: Partial<GridColumn<TData, boolean>>,
): GridColumn<TData, boolean> =>
  createColumn(key, props, {
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
  margin: { className: 'w-[16px]' },
};
