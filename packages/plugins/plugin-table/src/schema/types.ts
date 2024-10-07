//
// Copyright 2023 DXOS.org
//

import {
  type EchoObjectAnnotation,
  FieldMeta,
  ReferenceAnnotationId,
  getFieldMetaAnnotation,
  ref,
} from '@dxos/echo-schema';
import { AST, S } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { type ColumnProps, type TableDef } from '@dxos/react-ui-table';

import { type TableType } from '../types';

const FIELD_META_NAMESPACE = 'plugin-table';
const typeToSchema: Partial<{ [key in ColumnProps['type']]: S.Schema<any> }> = {
  boolean: S.Boolean,
  number: S.Number,
  date: S.Number,
  string: S.String,
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
    schema = referencedSchema ? ref(referencedSchema) : S.String;
  } else {
    schema = (type && typeToSchema[type]) ?? S.String;
  }
  return schema.pipe(
    FieldMeta(FIELD_META_NAMESPACE, {
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
    const refAnnotation = property.type.annotations[ReferenceAnnotationId] as EchoObjectAnnotation;
    const digits = getFieldMetaAnnotation<ColumnAnnotation>(property, FIELD_META_NAMESPACE)?.digits;
    return {
      id: String(id)!,
      prop: String(id)!,
      type: getPropType(type),
      refTable: refAnnotation?.schemaId,
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
