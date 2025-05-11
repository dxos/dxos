//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { Format, ObjectId, S } from '@dxos/echo-schema';

export const AccessToken = S.Struct({
  id: ObjectId,
  note: S.String.annotations({
    title: 'Note',
    description: 'User-provided note about the token.',
  }),

  /**
   * @example `github.com`
   */
  source: Format.Hostname.annotations({
    title: 'Source',
    description: 'The domain name of the service that issued the token.',
    examples: ['github.com']
  }),
  token: S.String.annotations({
    title: 'Token',
    description: 'The token provided by the service.',
  }),
}).pipe(
  Type.def({
    typename: 'dxos.org/type/AccessToken',
    version: '0.1.0',
  }),
);

export interface AccessToken extends S.Schema.Type<typeof AccessToken> {}
