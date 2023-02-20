//
// Copyright 2022 DXOS.org
//

import React, { useEffect, useState } from 'react';
import { Column } from 'react-table';

import { Document, EchoSchemaType, TypeFilter } from '@dxos/echo-schema';
import { PublicKey, useQuery } from '@dxos/react-client';
import { Table, Searchbar, Selector, SelectorOption } from '@dxos/react-components';

import { useFrameState } from '../../hooks';
import { schema } from '../../proto';

// UX field types.
const COLUMN_TYPES = ['string', 'number', 'boolean'];

type ColumnType<T extends Document> = SelectorOption & {
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
        accessor: (object) => PublicKey.from(object.id).truncate()
      }
    ];

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

const getType = (id: string): ColumnType<any> => types.find((type) => type.id === id)!;

export const TableFrame = () => {
  const { space } = useFrameState();
  const [type, setType] = useState<ColumnType<any>>(types[0]);
  const [text, setText] = useState<string>();
  const objects = useQuery(space, type.filter).filter(type.subFilter?.(text) ?? Boolean);

  useEffect(() => {
    setType(types[0]);
  }, []);

  const handleSearch = (text: string) => {
    setText(text);
  };

  const handleSelect = (id?: string) => {
    if (id) {
      setType(getType(id));
    }
  };

  return (
    <div className='flex flex-col flex-1 overflow-hidden px-2'>
      <div className='flex py-2'>
        <div className='mr-4'>
          <Selector options={types} value={type.id} onSelect={handleSelect} />
        </div>
        <div>
          <Searchbar onSearch={handleSearch} />
        </div>
      </div>

      {/* TODO(burdon): Editable variant. */}
      <Table<Document>
        columns={type.columns}
        data={objects}
        slots={{
          header: { className: 'bg-paper-1-bg' },
          row: { className: 'hover:bg-selection-hover odd:bg-table-rowOdd even:bg-table-rowEven' }
        }}
      />
      {/* </div> */}
    </div>
  );
};
