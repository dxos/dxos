//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { Column } from 'react-table';

import { Document, EchoSchemaType, TypeFilter } from '@dxos/echo-schema';
import { schema } from '@dxos/kai-types';
import { PublicKey, useQuery } from '@dxos/react-client';
import { Table, Searchbar, Select } from '@dxos/react-components';

import { Toolbar } from '../../components';
import { useAppRouter } from '../../hooks';

// UX field types.
const COLUMN_TYPES = ['string', 'number', 'boolean'];

type ColumnType<T extends Document> = {
  id: string; // TODO(burdon): Type `name`?
  title: string;
  columns: Column<Document>[];
  filter?: TypeFilter<any>;
  subFilter?: (match?: string) => (object: T) => boolean;
};

// TODO(burdon): Factor out.
const generateTypes = (schemaTypes: EchoSchemaType[]) => {
  const generateColumns = (type: EchoSchemaType) => {
    const columns: Column<Document>[] = [
      {
        Header: 'id',
        accessor: (object) => PublicKey.from(object.id).truncate(),
        width: 120
      }
    ];

    for (const field of type.fields) {
      if (COLUMN_TYPES.includes(field.type.kind)) {
        const column: Column<Document> = {
          Header: field.name,
          accessor: field.name
        };

        switch (field.type.kind) {
          case 'boolean': {
            column.Cell = ({ value }) => <input type='checkbox' checked={value} disabled />;
            column.width = 120;
            break;
          }
        }

        columns.push(column);
      }
    }

    return columns;
  };

  return schemaTypes
    .map((schema) => ({
      id: schema.name,
      title: schema.shortName,
      columns: generateColumns(schema),
      filter: schema.createFilter(),
      subFilter:
        (match = '') =>
        (object: Document) =>
          JSON.stringify(object.toJSON()).includes(match)
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

const types: ColumnType<any>[] = generateTypes(schema.types);

export const getColumnType = (id: string): ColumnType<any> => types.find((type) => type.id === id)!;

export const TableFrame = () => {
  const { space } = useAppRouter();
  const [type, setType] = useState<ColumnType<any> | undefined>(types[0]);
  const [text, setText] = useState<string>();
  // TODO(burdon): Bug if changes.
  const objects = useQuery(space, type?.filter).filter(type?.subFilter?.(text) ?? Boolean);

  useEffect(() => {
    const initialType = types.find((type) => type.id === 'dxos.experimental.kai.Contact');
    setType(initialType);
  }, []);

  const handleSearch = (text: string) => {
    setText(text);
  };

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
      <Toolbar className='mb-2'>
        <div className='w-screen md:w-column'>
          <Select value={type?.id} onValueChange={(value) => value && setType(getColumnType(value))}>
            {types?.map((type) => (
              <Select.Item key={type.id} value={type.id}>
                {type.title}
              </Select.Item>
            ))}
          </Select>
        </div>

        <div className='grow' />
        <div className='w-screen md:w-column'>
          <Searchbar onSearch={handleSearch} />
        </div>
      </Toolbar>

      {type && (
        <div className='flex flex-1 overflow-hidden px-2'>
          <Table<Document>
            columns={type.columns}
            data={objects}
            slots={{
              header: { className: 'bg-paper-1-bg' },
              row: { className: 'hover:bg-hover-bg odd:bg-table-rowOdd even:bg-table-rowEven' }
            }}
          />
        </div>
      )}
    </div>
  );
};
