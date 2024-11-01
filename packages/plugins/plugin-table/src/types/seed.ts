// Copyright 2024 DXOS.org
//

import { S, type AbstractSchema, TypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { FieldKindEnum, type ViewType } from '@dxos/schema';

// TODO(burdon): Prompt user for typename.
export const createStarterSchema = (typename?: string) => {
  return TypedObject({ typename: typename ?? 'example.com/type/' + PublicKey.random().toHex(), version: '0.1.0' })({
    name: S.optional(S.String),
    description: S.optional(S.String),
    quantity: S.optional(S.Number),
  });
};

// TODO(burdon): Generate from schema.
export const createStarterView = (schema: AbstractSchema): ViewType => {
  return {
    schema: schema.typename,
    fields: [
      { path: 'name', label: 'Name', type: FieldKindEnum.String },
      { path: 'description', label: 'Description', type: FieldKindEnum.String },
      { path: 'quantity', label: 'Quantity', type: FieldKindEnum.Number },
    ],
  };
};
