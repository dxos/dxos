//
// Copyright 2024 DXOS.org
//

import { Schema } from 'effect';

import { ContactType } from '@dxos/client/testing';
import { Type } from '@dxos/echo';
import { toJsonSchema } from '@dxos/echo-schema';

export const functions = [
  {
    name: 'example.com/function/chess',
    version: '0.1.0',
    inputSchema: toJsonSchema(
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
    inputSchema: toJsonSchema(
      Schema.Struct({
        from: Schema.String.annotations({ title: 'Currency from' }),
        to: Schema.String.annotations({ title: 'Currency to' }),
      }),
    ),
  },
  {
    name: 'example.com/function/ping-contact',
    version: '0.0.1',
    inputSchema: toJsonSchema(
      Schema.Struct({
        contact: Type.Ref(ContactType).annotations({ title: 'Contact' }),
      }),
    ),
  },
];
