//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';
import { Column } from 'react-table';

import { Document, DocumentBase, EchoSchemaType, TypeFilter } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';
import { Selector, SelectorOption } from '@dxos/react-components';

import { Searchbar, Table } from '../components';
import { useSpace } from '../hooks';
import { Contact, Organization, Project } from '../proto';

// UX field types.
const COLUMN_TYPES = ['string', 'number', 'boolean'];

type ColumnType<T extends DocumentBase> = SelectorOption & {
  filter?: TypeFilter<any>;
  subFilter?: (match?: string) => (object: T) => boolean;
  columns: Column<Document>[];
};

const generateTypes = (schemaTypes: EchoSchemaType[]) => {
  const generateColumns = (type: EchoSchemaType) => {
    const columns: Column<Document>[] = [];
    for (const field of type.fields) {
      if (COLUMN_TYPES.includes(field.type.kind)) {
        columns.push({
          Header: field.name,
          accessor: field.name
        });
      }
    }
    return columns;
  };

  return schemaTypes.map((schema) => ({
    id: schema.name,
    title: schema.shortName,
    columns: generateColumns(schema),
    filter: schema.createFilter(),
    subFilter:
      (match = '') =>
      (object: Document) =>
        JSON.stringify(object.toJSON()).includes(match)
  }));
};

const types: ColumnType<any>[] = generateTypes([Organization.type, Project.type, Contact.type]);

const getType = (id: string): ColumnType<any> => types.find((type) => type.id === id)!;

export const TableFrame = () => {
  const space = useSpace();
  const [type, setType] = useState<ColumnType<any>>(types[2]);
  const [text, setText] = useState<string>();
  const objects = useQuery(space, type.filter).filter(type.subFilter?.(text) ?? Boolean);

  const handleSearch = (text: string) => {
    setText(text);
  };

  const handleSelect = (id?: string) => {
    if (id) {
      setType(getType(id));
    }
  };

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <div className='flex p-3 border-b border-slate-200 border-solid'>
        <div className='flex'>
          <div className='mr-2'>
            <Selector options={types} value={type.id} onSelect={handleSelect} />
          </div>
          <div>
            <Searchbar onSearch={handleSearch} />
          </div>
        </div>
      </div>

      {/* <div className='flex flex-1 overflow-hidden'> */}
      <Table<Document> columns={type.columns} data={objects} />
      {/* </div> */}
    </div>
  );
};

export default TableFrame;
