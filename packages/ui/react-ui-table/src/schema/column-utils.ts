//
// Copyright 2024 DXOS.org
//

import { type ColumnDef } from '@tanstack/react-table';

import { type S } from '@dxos/echo-schema';
import { FieldFormatEnum, mapSchemaToFields } from '@dxos/schema';

import { createColumnBuilder } from '../helpers';

export const schemaToColumnDefs = <T>(schema: S.Schema<T, any>): ColumnDef<T, any>[] => {
  const { helper, builder } = createColumnBuilder<T>();

  const classified = mapSchemaToFields(schema);
  return classified.map(([name, type]) => {
    const propertyKey = name.toString();

    let column: Partial<ColumnDef<any, any>> | undefined;
    switch (type) {
      case FieldFormatEnum.String: {
        column = builder.string({ label: propertyKey, classNames: [name === 'id' && 'font-mono'] });
        break;
      }
      case FieldFormatEnum.Number: {
        column = builder.number({ label: propertyKey });
        break;
      }
      case FieldFormatEnum.Boolean: {
        column = builder.switch({ label: propertyKey });
        break;
      }
      case FieldFormatEnum.Date: {
        column = builder.date({ label: propertyKey });
        break;
      }
      case FieldFormatEnum.JSON: {
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
