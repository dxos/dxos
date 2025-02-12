//
// Copyright 2025 DXOS.org
//

import { Format, S, TypedObject } from '@dxos/echo-schema';

export const AccessTokenSchema = S.Struct({
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

  /**
   * User-provided note about the token.
   */
  note: S.String.annotations({
    title: 'Note',
    description: 'User-provided note about the token.',
  }),
});

// TODO(wittjosiah): This is a temporary solution, long term these should be stored in HALO.
export class AccessTokenType extends TypedObject({ typename: 'dxos.org/type/AccessToken', version: '0.1.0' })(
  AccessTokenSchema.fields,
) {}
