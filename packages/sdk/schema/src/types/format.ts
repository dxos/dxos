//
// Copyright 2024 DXOS.org
//

import { ScalarEnum, FormatEnum, S } from '@dxos/echo-schema';

const DecimalPrecision = S.transform(S.Number, S.Number, {
  strict: true,
  encode: (value) => Math.pow(10, -value),
  decode: (value) => Math.log10(1 / value),
});

export const BaseProperty = S.Struct({
  // TODO(burdon): Cannot extend enum with literal.
  // format: S.Enums(FormatEnum),
  // type: S.Enums(ScalarEnum),
  format: S.String,
  type: S.String,
  property: S.String,
  title: S.String,
  description: S.optional(S.String),
}).pipe(S.mutable);

export type BaseProperty = S.Schema.Type<typeof BaseProperty>;

//
// Numbers
//

export const PercentSchema = S.extend(
  BaseProperty,
  S.Struct({
    format: S.Literal(FormatEnum.Percent),
    type: S.Literal(ScalarEnum.Number),
    multipleOf: DecimalPrecision,
  }),
);

export const CurrencySchema = S.extend(
  BaseProperty,
  S.Struct({
    format: S.Literal(FormatEnum.Currency),
    type: S.Literal(ScalarEnum.Number),
    multipleOf: DecimalPrecision,
    currency: S.String,
  }),
);

export const FieldSchema = S.Union(PercentSchema, CurrencySchema);

export type Field = S.Schema.Type<BaseProperty>;

export const FieldMap: Partial<Record<FormatEnum, S.Schema.Any>> = {
  [FormatEnum.Percent]: PercentSchema,
  [FormatEnum.Currency]: CurrencySchema,
};

export const getSchema = (property: BaseProperty): S.Schema.Any | undefined => {
  return FieldMap[property.format as FormatEnum];
};
