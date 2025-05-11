//
// Copyright 2025 DXOS.org
//

import { Type } from '@dxos/echo';
import { Format, ObjectId, S } from '@dxos/echo-schema';

export const AccessTokenType = S.Struct({
  id: ObjectId,

  /**
   * User-provided note about the token.
   */
  note: S.String.annotations({
    title: 'Note',
    description: 'User-provided note about the token.',
  }),

  /**
   * The domain name of the service that issued the token.
   * @example `github.com`
   */
  source: Format.Hostname.annotations({
    title: 'Source',
    description: 'The domain name of the service that issued the token.',
  }),

  /**
   * The token provided by the service.
   */
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

export type AccessTokenType = S.Schema.Type<typeof AccessTokenType>;
