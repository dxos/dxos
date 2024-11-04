//
// Copyright 2024 DXOS.org
//

import type { JSONSchema } from '@effect/schema';

// TODO(burdon): All types.
export enum ScalarEnum {
  String,
  Number,
  Boolean,
  Ref,
}

export type ScalarType =
  | JSONSchema.JsonSchema7String
  | JSONSchema.JsonSchema7Number
  | JSONSchema.JsonSchema7Boolean
  | JSONSchema.JsonSchema7Ref;

// TODO(burdon): Test.
export const getScalarType = (property: JSONSchema.JsonSchema7): ScalarEnum | undefined => {
  switch ((property as any).type) {
    case 'string':
      return ScalarEnum.String;
    case 'number':
      return ScalarEnum.Number;
    case 'boolean':
      return ScalarEnum.Boolean;
  }

  // TODO(burdon): Ref.

  return undefined;
};
