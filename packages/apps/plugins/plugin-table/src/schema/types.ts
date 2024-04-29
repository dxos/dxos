//
// Copyright 2023 DXOS.org
//

import { type TableType } from '@braneframe/types';
import { AST, fieldMeta, S, ref } from '@dxos/echo-schema';
import { type EchoObjectAnnotation, getFieldMetaAnnotation, ReferenceAnnotation } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { type ColumnProps, type TableDef } from '@dxos/react-ui-table';

const FIELD_META_NAMESPACE = 'plugin-table';
const typeToSchema: Partial<{ [key in ColumnProps['type']]: S.Schema<any> }> = {
  boolean: S.boolean,
  number: S.number,
  date: S.number,
  string: S.string,
};

interface ColumnAnnotation {
  digits?: number;
  refProp?: string;
}

export const getPropType = (type?: AST.AST): ColumnProps['type'] => {
  if (type == null) {
    return 'string';
  }
  if (AST.isTypeLiteral(type)) {
    return 'ref';
  } else if (AST.isBooleanKeyword(type)) {
    return 'boolean';
  } else if (AST.isNumberKeyword(type)) {
    return 'number';
  } else {
    return 'string';
  }
};

export const getSchema = (
  tables: TableType[],
  type: ColumnProps['type'] | undefined,
  options: { digits?: number; refProp?: string; refTable?: string },
): S.Schema<any> => {
  let schema: S.Schema<any>;
  if (type === 'ref') {
    const referencedSchema = tables.find((table) => table.schema?.id === options.refTable)?.schema;
    schema = referencedSchema ? ref(referencedSchema) : S.string;
  } else {
    schema = (type && typeToSchema[type]) ?? S.string;
  }
  return schema.pipe(
    fieldMeta(FIELD_META_NAMESPACE, {
      refProp: options.refProp,
      digits: options.digits,
    }),
  );
};

export const schemaPropMapper =
  (table: TableType) =>
  (property: AST.PropertySignature): ColumnProps => {
    const { name: id, type } = property;
    const { label, refProp, size } = table.props?.find((prop) => prop.id === id) ?? {};
    const refAnnotation = property.type.annotations[ReferenceAnnotation] as EchoObjectAnnotation;
    const digits = getFieldMetaAnnotation<ColumnAnnotation>(property, FIELD_META_NAMESPACE)?.digits;
    return {
      id: String(id)!,
      prop: String(id)!,
      type: getPropType(type),
      refTable: refAnnotation?.storedSchemaId,
      refProp: refProp ?? undefined,
      label: label ?? undefined,
      digits,
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
