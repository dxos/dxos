//
// Copyright 2023 DXOS.org
//

import * as AST from '@effect/schema/AST';
import * as S from '@effect/schema/Schema';

import { type TableType } from '@braneframe/types';
import * as E from '@dxos/echo-schema';
import { type EchoObjectAnnotation, EchoObjectFieldMetaAnnotationId, ReferenceAnnotation } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { type ColumnProps, type TableDef } from '@dxos/react-ui-table';

interface ColumnAnnotation {
  digits: number;
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
  type: Omit<ColumnProps['type'], 'ref'> | undefined,
  options: { digits?: number },
): S.Schema<any> => {
  switch (type) {
    case 'boolean':
      return S.boolean;
    case 'number':
      return options?.digits ? S.number.pipe(E.fieldMeta({ digits: options.digits })) : S.number;
    case 'date':
      return S.number;
    case 'string':
    default:
      return S.string;
  }
};

export const schemaPropMapper =
  (table: TableType) =>
  (property: AST.PropertySignature): ColumnProps => {
    const { name: id, type } = property;
    const { label, refProp, size } = table.props?.find((prop) => prop.id === id) ?? {};
    const refAnnotation = property.type.annotations[ReferenceAnnotation] as EchoObjectAnnotation;
    const digits = (property.type.annotations[EchoObjectFieldMetaAnnotationId] as ColumnAnnotation)?.digits;
    return {
      id: String(id)!,
      prop: String(id)!,
      type: getPropType(type),
      refTable: refAnnotation?.typename,
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
