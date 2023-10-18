//
// Copyright 2023 DXOS.org
//

import { type Table as TableType } from '@braneframe/types';
import { type ColumnProps, type TableDef } from '@dxos/aurora-table';
import { Schema as SchemaType } from '@dxos/client/echo';
import { PublicKey } from '@dxos/keys';

export const getPropType = (type?: SchemaType.PropType): ColumnProps['type'] => {
  switch (type) {
    case SchemaType.PropType.REF:
      return 'ref';
    case SchemaType.PropType.BOOLEAN:
      return 'boolean';
    case SchemaType.PropType.NUMBER:
      return 'number';
    case SchemaType.PropType.DATE:
      return 'date';
    case SchemaType.PropType.STRING:
    default:
      return 'string';
  }
};

export const getSchemaType = (type?: ColumnProps['type']): SchemaType.PropType => {
  switch (type) {
    case 'ref':
      return SchemaType.PropType.REF;
    case 'boolean':
      return SchemaType.PropType.BOOLEAN;
    case 'number':
      return SchemaType.PropType.NUMBER;
    case 'date':
      return SchemaType.PropType.DATE;
    case 'string':
    default:
      return SchemaType.PropType.STRING;
  }
};

export const schemaPropMapper =
  (table: TableType) =>
  ({ id, type, digits, ref }: SchemaType.Prop): ColumnProps => {
    const { label, refProp, size } = table.props?.find((prop) => prop.id === id) ?? {};
    return {
      id: id!,
      prop: id!,
      type: getPropType(type),
      refTable: ref?.id,
      refProp,
      digits,

      label,
      size,

      editable: true,
      resizable: true,
    };
  };

export const createUniqueProp = (table: TableDef) => {
  for (let i = 1; i < 100; i++) {
    const prop = 'prop_' + i;
    if (!table.columns.find((column) => column.id === prop)) {
      return prop;
    }
  }

  return 'prop_' + PublicKey.random().toHex().slice(0, 8);
};
