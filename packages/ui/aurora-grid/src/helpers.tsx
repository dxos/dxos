//
// Copyright 2023 DXOS.org
//

import { Check, X } from '@phosphor-icons/react';
import { RowData } from '@tanstack/react-table';
import defaultsDeep from 'lodash.defaultsdeep';
import React from 'react';

import { PublicKey } from '@dxos/keys';

import { GridColumn, GridSlots } from './Grid';

export const createColumn = <TData extends RowData, TValue>(
  key: string,
  ...props: (Partial<GridColumn<TData, TValue>> | undefined)[]
): GridColumn<TData, TValue> => defaultsDeep({ key }, ...props);

export const createTextColumn = <TData extends RowData>(
  key: string,
  props?: Partial<GridColumn<TData, string>>,
): GridColumn<TData, string> => createColumn(key, props);

// TODO(burdon): createDateColumn.
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

// TODO(burdon): Copy to clipboard.
export const createKeyColumn = <TData extends RowData>(
  key: string,
  props?: Partial<GridColumn<TData, PublicKey>>,
): GridColumn<TData, PublicKey> =>
  createColumn(key, props, {
    width: 86,
    cell: {
      render: ({ value }) => value.truncate(),
      className: 'font-mono font-thin text-green-500',
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

export const defaultGridSlots: GridSlots = {
  header: { className: 'p-1 text-left font-thin' },
  footer: { className: 'p-1 text-left font-thin' },
  cell: { className: 'p-1' },
  row: { className: 'cursor-pointer hover:bg-gray-100' },
  focus: { className: 'ring-1 ring-green-400' },
  selected: { className: '!bg-green-100' },
};
