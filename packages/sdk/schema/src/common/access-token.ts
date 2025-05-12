//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Format, Type } from '@dxos/echo';

export const AccessToken = Schema.Struct({
  id: Type.ObjectId,
  note: Schema.optional(
    Schema.String.annotations({
      title: 'Note',
      description: 'User-provided note about the token.',
    }),
  ),
  source: Format.Hostname.annotations({
    title: 'Source',
    description: 'The domain name of the service that issued the token.',
    examples: ['github.com'],
  }),
  token: Schema.String.annotations({
    title: 'Token',
    description: 'The token provided by the service.',
  }),
}).pipe(
  Schema.annotations({
    description: 'A credential or token for accessing a service.',
  }),
  Type.def({
    typename: 'dxos.org/type/AccessToken',
    version: '0.1.0',
  }),
);

export interface AccessToken extends Schema.Schema.Type<typeof AccessToken> {}
