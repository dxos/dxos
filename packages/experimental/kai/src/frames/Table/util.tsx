//
// Copyright 2022 DXOS.org
//

import { noCase } from 'change-case';
import React from 'react';
import { Column } from 'react-table';

import { Document, EchoSchemaType, TypeFilter } from '@dxos/echo-schema';
import { schema } from '@dxos/kai-types';
import { PublicKey } from '@dxos/react-client';

// UX field types.
const COLUMN_TYPES = ['string', 'number', 'boolean'];

export type ColumnType<T extends Document> = {
  id: string; // TODO(burdon): Type `name`?
  title: string;
  columns: Column<Document>[];
  filter?: TypeFilter<any>;
  subFilter?: (match?: string) => (object: T) => boolean;
};

// TODO(burdon): Factor out.
export const generateTypes = (schemaTypes: EchoSchemaType[]) => {
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
          Header: noCase(field.name),
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
          JSON.stringify(object.toJSON()).toLowerCase().includes(match)
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
};

export const schemaTypes: ColumnType<any>[] = generateTypes(schema.types);

export const getColumnType = (id: string): ColumnType<any> => schemaTypes.find((type) => type.id === id)!;
