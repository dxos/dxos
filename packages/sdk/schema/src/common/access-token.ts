//
// Copyright 2025 DXOS.org
//

import { EchoObject, Format, ObjectId, S } from '@dxos/echo-schema';

export const AccessTokenSchema = S.Struct({
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
});

// TODO(wittjosiah): This is a temporary solution, long term these should be stored in HALO.
export const AccessTokenType = AccessTokenSchema.pipe(EchoObject('dxos.org/type/AccessToken', '0.1.0'));
export type AccessTokenType = S.Schema.Type<typeof AccessTokenType>;
