//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TestSchema } from '@dxos/client/testing';
import { JsonSchema, Ref, DXN } from '@dxos/echo';

export const functions = [
  {
    key: DXN.make('com.example.function.chess'),
    name: 'com.example.function.chess',
    version: '0.1.0',
    inputSchema: JsonSchema.toJsonSchema(
      Schema.Struct({
        level: Schema.Number.annotations({
          title: 'Level',
        }),
      }),
    ),
  },
  {
    key: DXN.make('com.example.function.forex'),
    name: 'com.example.function.forex',
    version: '0.1.0',
    binding: 'FOREX',
    inputSchema: JsonSchema.toJsonSchema(
      Schema.Struct({
        from: Schema.String.annotations({ title: 'Currency from' }),
        to: Schema.String.annotations({ title: 'Currency to' }),
      }),
    ),
  },
  {
    key: DXN.make('com.example.function.pingContact'),
    name: 'com.example.function.ping-contact',
    version: '0.0.1',
    inputSchema: JsonSchema.toJsonSchema(
      Schema.Struct({
        contact: Ref.Ref(TestSchema.ContactType).annotations({ title: 'Contact' }),
      }),
    ),
  },
];
