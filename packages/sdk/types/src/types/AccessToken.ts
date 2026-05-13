//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Type } from '@dxos/echo';
import { Format, LabelAnnotation, SystemTypeAnnotation } from '@dxos/echo/internal';

/** @deprecated Use AccessToken instead. */
export const LegacyAccessToken = Schema.Struct({
  source: Schema.String,
  token: Schema.String,
}).pipe(
  Type.object({
    typename: 'org.dxos.type.access-token',
    version: '0.1.0',
  }),
  SystemTypeAnnotation.set(true),
);

export interface LegacyAccessToken extends Schema.Schema.Type<typeof LegacyAccessToken> {}

export const AccessToken = Schema.Struct({
  source: Format.Hostname.annotations({
    title: 'Source',
    description: 'The domain name of the service that issued the token.',
    examples: ['github.com'],
  }),
  account: Schema.String.annotations({
    title: 'Account',
    description: 'The account associated with the token.',
  }).pipe(Schema.optional),
  token: Schema.String.annotations({
    title: 'Token',
    description: 'The token provided by the service.',
  }),
  scopes: Schema.Array(Schema.String)
    .annotations({
      title: 'Scopes',
      description: 'The scopes granted to this token by the service.',
    })
    .pipe(Schema.optional),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.accessToken',
    version: '0.1.0',
  }),
  Schema.annotations({
    description: 'A credential or token for accessing a service.',
  }),
  LabelAnnotation.set(['account', 'source']), // Account first (e.g. email from /members/me); source as fallback.
  Annotation.IconAnnotation.set({
    icon: 'ph--key--regular',
    hue: 'yellow',
  }),
  SystemTypeAnnotation.set(true),
);

export interface AccessToken extends Schema.Schema.Type<typeof AccessToken> {}

export const make = (props: Obj.MakeProps<typeof AccessToken>) => Obj.make(AccessToken, props);
