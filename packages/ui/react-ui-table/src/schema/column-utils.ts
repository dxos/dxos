//
// Copyright 2024 DXOS.org
//

import { type ColumnDef } from '@tanstack/react-table';

import { type S } from '@dxos/echo-schema';
import { FieldValueType, mapSchemaToFields } from '@dxos/schema';

import { createColumnBuilder } from '../helpers';

export const schemaToColumnDefs = <T>(schema: S.Schema<T, any>): ColumnDef<T, any>[] => {
  const { helper, builder } = createColumnBuilder<T>();

  const classified = mapSchemaToFields(schema);
  return classified.map(([name, type]) => {
    const propertyKey = name.toString();

    let column: Partial<ColumnDef<any, any>> | undefined;
    switch (type) {
      case FieldValueType.String: {
        column = builder.string({ label: propertyKey });
        break;
      }
      case FieldValueType.Number: {
        column = builder.number({ label: propertyKey });
        break;
      }
      case FieldValueType.Boolean: {
        column = builder.switch({ label: propertyKey });
        break;
      }
      case FieldValueType.Date: {
        column = builder.date({ label: propertyKey });
        break;
      }
      case FieldValueType.JSON: {
        column = builder.json({ label: propertyKey, id: propertyKey });
        break;
      }
      default: {
        throw new Error(`Unhandled column type: ${type}`);
      }
    }

    return helper.accessor(propertyKey as any, column);
  });
};
