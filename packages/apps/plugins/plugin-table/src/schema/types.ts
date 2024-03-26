//
// Copyright 2023 DXOS.org
//

import { type Table as TableType } from '@braneframe/types/proto';
import { PublicKey } from '@dxos/react-client';
import { Schema } from '@dxos/react-client/echo';
import { type ColumnProps, type TableDef } from '@dxos/react-ui-table';

export const getPropType = (type?: Schema.PropType): ColumnProps['type'] => {
  switch (type) {
    case Schema.PropType.REF:
      return 'ref';
    case Schema.PropType.BOOLEAN:
      return 'boolean';
    case Schema.PropType.NUMBER:
      return 'number';
    case Schema.PropType.DATE:
      return 'date';
    case Schema.PropType.STRING:
    default:
      return 'string';
  }
};

export const getSchema = (type?: ColumnProps['type']): Schema.PropType => {
  switch (type) {
    case 'ref':
      return Schema.PropType.REF;
    case 'boolean':
      return Schema.PropType.BOOLEAN;
    case 'number':
      return Schema.PropType.NUMBER;
    case 'date':
      return Schema.PropType.DATE;
    case 'string':
    default:
      return Schema.PropType.STRING;
  }
};

export const schemaPropMapper =
  (table: TableType) =>
  ({ id, type, digits, ref }: Schema.Prop): ColumnProps => {
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
