//
// Copyright 2024 DXOS.org
//

import { AST, ScalarEnum, FormatEnum, S } from '@dxos/echo-schema';

export const DecimalPrecision = S.transform(S.Number, S.Number, {
  strict: true,
  encode: (value) => Math.pow(10, -value),
  decode: (value) => Math.log10(1 / value),
});

export const BasePropertySchema = S.Struct({
  property: S.String, // TODO(burdon): Restrict chars.
  title: S.String,
  description: S.optional(S.String),
}).pipe(S.mutable);

export type BaseProperty = S.Schema.Type<typeof BasePropertySchema>;

//
// Numbers
//

export const PercentSchema = S.extend(
  BasePropertySchema,
  S.Struct({
    format: S.Literal(FormatEnum.Percent),
    type: S.Literal(ScalarEnum.Number),
    multipleOf: S.optional(DecimalPrecision),
  }),
);

export const CurrencySchema = S.extend(
  BasePropertySchema,
  S.Struct({
    format: S.Literal(FormatEnum.Currency),
    type: S.Literal(ScalarEnum.Number),
    multipleOf: S.optional(DecimalPrecision),
    currency: S.optional(S.String),
  }),
);

export const PropertySchema = S.Union(PercentSchema, CurrencySchema);

export type Property = S.Schema.Type<typeof PropertySchema>;

// TODO(burdon): Generic util to determine type from discriminated union.
export const getPropertySchema = (format: FormatEnum): S.Schema<any> | undefined => {
  for (const member of PropertySchema.members) {
    for (const prop of AST.getPropertySignatures(member.ast)) {
      if (prop.name === 'format' && prop.type._tag === 'Literal' && prop.type.literal === format) {
        return member;
      }
    }
  }

  return undefined;
};
