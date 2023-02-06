//
// Copyright 2022 DXOS.org
//

import React, { useState } from 'react';
import { Column } from 'react-table';

import { Document, DocumentBase, EchoSchemaType, TypeFilter } from '@dxos/echo-schema';
import { useQuery } from '@dxos/react-client';

import { Searchbar, Selector, SelectorOption, Table } from '../components';
import { useSpace } from '../hooks';
import { Contact, Organization, Project } from '../proto';

type ColumnType<T extends DocumentBase> = SelectorOption & {
  filter?: TypeFilter<any>;
  subFilter?: (match?: string) => (object: T) => boolean;
  columns: Column<Document>[];
};

const capitalizeFirstLetter = (str: string) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

const generateTypes = (schemas: EchoSchemaType[]) => {
  const generateColumns = (schema: EchoSchemaType) => {
    const basicTypes = ['string', 'number', 'boolean'];
    const columns: Column<Document>[] = [];
    for (const field of schema.fields) {
      if (basicTypes.includes(field.type.kind)) {
        columns.push({
          Header: capitalizeFirstLetter(field.name),
          accessor: field.name
        });
      }
    }
    return columns;
  };

  return schemas.map((schema) => ({
    id: schema.name,
    title: schema.shortName,
    filter: schema.createFilter(),
    subFilter:
      (match = '') =>
      (object: Document) =>
        JSON.stringify(object.toJSON()).includes(match),
    columns: generateColumns(schema)
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
