//
// Copyright 2024 DXOS.org
//

import type * as S from '@effect/schema/Schema';
import { type ColumnDef } from '@tanstack/react-table';

import { classifySchemaProperties } from './schema';
import { createColumnBuilder } from '../../helpers';

export const schemaToColumnDefs = <T>(schema: S.Schema<T, any>): ColumnDef<T, any>[] => {
  const classified = classifySchemaProperties(schema);

  const { helper, builder } = createColumnBuilder<T>();

  return classified.map(([name, type]) => {
    const propertyKey = name.toString();

    let column: Partial<ColumnDef<any, any>> | undefined;

    switch (type) {
      case 'string': {
        column = builder.string({ label: propertyKey });
        break;
      }
      case 'number': {
        column = builder.number({ label: propertyKey });
        break;
      }
      case 'boolean': {
        column = builder.switch({ label: propertyKey });
        break;
      }
      case 'date': {
        column = builder.date({ label: propertyKey });
        break;
      }
      case 'display': {
        column = builder.string({ label: propertyKey, id: propertyKey });
        break;
      }
    }

    if (column === undefined) {
      throw new Error(`Unhandled column type: ${type}`);
    }

    // TODO(zan): Make this more robust by defining a cell type
    const accessor: any = type === 'display' ? (s: T) => `${JSON.stringify(s[propertyKey as keyof T])}` : propertyKey;

    return helper.accessor(accessor, column);
  });
};
