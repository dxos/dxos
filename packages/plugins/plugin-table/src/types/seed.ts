// Copyright 2024 DXOS.org
//

import { S, TypedObject } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { FieldValueType, type ViewType } from '@dxos/schema';

export const createStarterSchema = (typename?: string) => {
  // TODO(burdon): Prompt user for typename.
  return TypedObject({ typename: typename ?? 'example.com/type/' + PublicKey.random().toHex(), version: '0.1.0' })({
    name: S.optional(S.String),
    description: S.optional(S.String),
    quantity: S.optional(S.Number),
  });
};

// TODO(burdon): Generate from schema.
export const createStarterView = (): ViewType => {
  return {
    fields: [
      { id: 'name', path: 'name', label: 'Name', type: FieldValueType.String },
      { id: 'description', path: 'description', label: 'Description', type: FieldValueType.String },
      { id: 'quantity', path: 'quantity', label: 'Quantity', type: FieldValueType.Number },
    ],
  };
};
