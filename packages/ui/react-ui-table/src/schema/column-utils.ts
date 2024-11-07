//
// Copyright 2024 DXOS.org
//

import { type ColumnDef } from '@tanstack/react-table';

import { ScalarEnum, type S } from '@dxos/echo-schema';
import { FormatEnum } from '@dxos/echo-schema';
import { mapSchemaToFields } from '@dxos/schema';

import { createColumnBuilder } from '../helpers';

/**
 * @deprecated
 */
export const schemaToColumnDefs = <T>(schema: S.Schema<T, any>): ColumnDef<T, any>[] => {
  const { helper, builder } = createColumnBuilder<T>();

  return mapSchemaToFields(schema).map(({ property, type, format }) => {
    const propertyKey = property.toString();

    if (!format) {
      switch (type) {
        case ScalarEnum.String: {
          return helper.accessor(
            propertyKey as any,
            builder.string({ label: propertyKey, classNames: [property === 'id' && 'font-mono'] }),
          );
        }
        case ScalarEnum.Number: {
          return helper.accessor(propertyKey as any, builder.number({ label: propertyKey }));
        }
        case ScalarEnum.Boolean: {
          return helper.accessor(propertyKey as any, builder.switch({ label: propertyKey }));
        }
        default: {
          throw new Error(`Unhandled scalar type: ${type}`);
        }
      }
    }

    switch (format) {
      case FormatEnum.Date: {
        return helper.accessor(propertyKey as any, builder.date({ label: propertyKey }));
      }
      case FormatEnum.JSON: {
        return helper.accessor(propertyKey as any, builder.json({ label: propertyKey, id: propertyKey }));
      }
      default: {
        throw new Error(`Unhandled format: ${format}`);
      }
    }
  });
};
