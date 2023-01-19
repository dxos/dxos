//
// Copyright 2023 DXOS.org
//

import React, { useState } from 'react';
import { Column } from 'react-table';

import { Searchbar, Selector, SelectorOption, Table } from '@dxos/kai';
import { JsonTreeView } from '@dxos/react-components-deprecated';

const defaultSubFilter =
  (match = '') =>
  (object: Object) => {
    return JSON.stringify(object).includes(match);
  };

export type ColumnType<T extends {}> = SelectorOption & {
  filter: (object: T) => boolean;
  subFilter?: (match?: string) => (object: T) => boolean;
  columns: Column<T>[];
};

export type MasterTableProps<T extends {}> = { types: ColumnType<T>[]; data: T[]; onSelectType?: (id: string) => void };

export const MasterTable = ({ types, data, onSelectType }: MasterTableProps<any>) => {
  const [text, setText] = useState<string>('');
  const handleSearch = (text: string) => {
    setText(text);
  };

  const [type, setType] = useState<ColumnType<any>>(types[0]);
  const selectType = (id?: string) => {
    if (id) {
      setType(types.find((type) => type.id === id)!);
      setSelected(0);
      onSelectType?.(id);
    }
  };

  const [selected, setSelected] = useState<number>(0);
  const selectRow = (index: number) => {
    setSelected(index);
  };

  const getFilteredData = () =>
    data.filter(type.filter).filter(type.subFilter ? type.subFilter(text) : defaultSubFilter(text));

  return (
    <div className='flex flex-col flex-1'>
      <div className='flex p-3 border-b border-slate-200 border-solid'>
        <div className='flex'>
          <div className='mr-2'>
            <Selector options={types} value={type.id} onSelect={selectType} />
          </div>
          <div>
            <Searchbar onSearch={handleSearch} />
          </div>
        </div>
      </div>
      <div className='flex flex-row'>
        <div className='flex w-1/2 h-full'>
          <Table
            columns={type.columns as any}
            data={getFilteredData() as any}
            selected={selected}
            onSelect={selectRow}
          />
        </div>
        <div className='flex w-1/2 h-full'>
          <JsonTreeView data={getFilteredData().at(selected)} />
        </div>
      </div>
    </div>
  );
};
