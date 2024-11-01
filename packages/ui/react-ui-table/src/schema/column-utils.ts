//
// Copyright 2024 DXOS.org
//

import { type ColumnDef } from '@tanstack/react-table';

import { type S } from '@dxos/echo-schema';
import { FieldKindEnum, mapSchemaToFields } from '@dxos/schema';

import { createColumnBuilder } from '../helpers';

export const schemaToColumnDefs = <T>(schema: S.Schema<T, any>): ColumnDef<T, any>[] => {
  const { helper, builder } = createColumnBuilder<T>();

  const classified = mapSchemaToFields(schema);
  return classified.map(([name, type]) => {
    const propertyKey = name.toString();

    let column: Partial<ColumnDef<any, any>> | undefined;
    switch (type) {
      case FieldKindEnum.String: {
        column = builder.string({ label: propertyKey, classNames: [name === 'id' && 'font-mono'] });
        break;
      }
      case FieldKindEnum.Number: {
        column = builder.number({ label: propertyKey });
        break;
      }
      case FieldKindEnum.Boolean: {
        column = builder.switch({ label: propertyKey });
        break;
      }
      case FieldKindEnum.Date: {
        column = builder.date({ label: propertyKey });
        break;
      }
      case FieldKindEnum.JSON: {
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
