//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { HiddenAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { Format } from '@dxos/echo/Format';

export class AccessToken extends Type.makeObject<AccessToken>(DXN.make('org.dxos.type.accessToken', '0.1.0'))(
  Schema.Struct({
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
    LabelAnnotation.set(['account', 'source']), // Account first (e.g. email from /members/me); source as fallback.
    Annotation.IconAnnotation.set({ icon: 'ph--key--regular', hue: 'yellow' }),
    HiddenAnnotation.set(true),
    Schema.annotations({
      description: 'A credential or token for accessing a service.',
    }),
  ),
) {}

export const make = (props: Obj.MakeProps<typeof AccessToken>) => Obj.make(AccessToken, props);
