// Copyright 2024 DXOS.org
//

import { S, TypedObject, type JsonPath, toJsonSchema } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/react-client';
import { type ViewType } from '@dxos/schema';

// TODO(burdon): Prompt user for typename.
export const createStarterSchema = (typename?: string) => {
  return TypedObject({ typename: typename ?? 'example.com/type/' + PublicKey.random().toHex(), version: '0.1.0' })({
    name: S.optional(S.String),
    description: S.optional(S.String),
    quantity: S.optional(S.Number),
  });
};

// TODO(ZaymonFC): I'm not sure this should take a mutableSchema any more!
export const createStarterView = (schema: S.Schema<any>): ViewType => {
  const jsonSchema = toJsonSchema(schema);

  return {
    schema: jsonSchema,
    query: {},
    fields: [{ path: 'name' as JsonPath }, { path: 'description' as JsonPath }, { path: 'quantity' as JsonPath }],
  };
};
