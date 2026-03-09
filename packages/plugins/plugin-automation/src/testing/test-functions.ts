//
// Copyright 2024 DXOS.org
//

import * as Schema from 'effect/Schema';

import { TestSchema } from '@dxos/client/testing';
import { JsonSchema, Ref, Type } from '@dxos/echo';

export const functions = [
  {
    name: 'example.com/function/chess',
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
    name: 'example.com/function/forex',
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
    name: 'example.com/function/ping-contact',
    version: '0.0.1',
    inputSchema: JsonSchema.toJsonSchema(
      Schema.Struct({
        contact: Ref.Ref(TestSchema.ContactType).annotations({ title: 'Contact' }),
      }),
    ),
  },
];
