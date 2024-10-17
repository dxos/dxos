//
// Copyright 2023 DXOS.org
//

import {
  AST,
  type EchoObjectAnnotation,
  FieldMeta,
  getFieldMetaAnnotation,
  ref,
  ReferenceAnnotationId,
  S,
} from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { type ColumnDef, type TableDef } from '@dxos/react-ui-table';
import { FieldValueType } from '@dxos/schema';

import { type TableType } from '../types';

const FIELD_META_NAMESPACE = 'plugin-table';

const typeToSchema: Partial<{ [key in FieldValueType]: S.Schema<any> }> = {
  boolean: S.Boolean,
  number: S.Number,
  date: S.Number,
  string: S.String,
};

interface ColumnAnnotation {
  digits?: number;
  refProp?: string;
}

export const getSchema = (
  tables: TableType[],
  type: FieldValueType | undefined,
  options: { digits?: number; refProp?: string; refTable?: string },
): S.Schema<any> => {
  let schema: S.Schema<any>;
  if (FieldValueType.Ref) {
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

// TODO(burdon): Reconcile with react-ui-data.
export const mapTableToColumns =
  (table: TableType) =>
  (property: AST.PropertySignature): ColumnDef => {
    const { name: id, type } = property;
    const { label, refProp, size } = table.props?.find((prop) => prop.id === id) ?? {};
    const refAnnotation = property.type.annotations[ReferenceAnnotationId] as EchoObjectAnnotation;
    const digits = getFieldMetaAnnotation<ColumnAnnotation>(property, FIELD_META_NAMESPACE)?.digits;
    return {
      id: String(id)!,
      prop: String(id)!,
      type: toFieldValueType(type),
      refTable: refAnnotation?.schemaId,
      refProp: refProp ?? undefined,
      label: label ?? undefined,
      digits,
      size,

      editable: true,
      resizable: true,
    };
  };

// TODO(burdon): Reconcile with react-ui-data/typeToColumn
export const toFieldValueType = (type?: AST.AST): FieldValueType => {
  if (type == null) {
    return FieldValueType.String;
  }

  if (AST.isTypeLiteral(type)) {
    return FieldValueType.Ref;
  } else if (AST.isBooleanKeyword(type)) {
    return FieldValueType.Boolean;
  } else if (AST.isNumberKeyword(type)) {
    return FieldValueType.Number;
  } else {
    return FieldValueType.String;
  }
};

// TODO(burdon): Reconcile with react-ui-data.
export const getUniqueProperty = (table: TableDef) => {
  for (let i = 1; i < 100; i++) {
    const prop = 'prop_' + i;
    if (!table.columns.find((column) => column.id === prop)) {
      return prop;
    }
  }

  // TODO(burdon): Const for prefix.
  return 'prop_' + PublicKey.random().toHex().slice(0, 8);
};
