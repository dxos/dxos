//
// Copyright 2025 DXOS.org
//

import { TitleAnnotationId } from '@effect/schema/AST';

import { Format, S, TypedObject } from '@dxos/echo-schema';

export const AccessTokenSchema = S.Struct({
  note: S.String.annotations({ [TitleAnnotationId]: 'Note' }),
  source: Format.Hostname.annotations({ [TitleAnnotationId]: 'Source' }),
  token: S.String.annotations({ [TitleAnnotationId]: 'Token' }),
});

// TODO(wittjosiah): This is a temporary solution, long term these should be stored in HALO.
export class AccessTokenType extends TypedObject({ typename: 'dxos.org/type/AccessToken', version: '0.1.0' })(
  AccessTokenSchema.fields,
) {}
