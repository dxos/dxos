//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

<<<<<<< HEAD
import { Annotation, Format, Obj, Type } from '@dxos/echo';
||||||| 87517e966b
import { Obj, Type } from '@dxos/echo';
=======
import { Obj, Type } from '@dxos/echo';
import { SystemTypeAnnotation } from '@dxos/echo/internal';
>>>>>>> origin/main

export const AccessToken = Schema.Struct({
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
  Type.Obj({
    typename: 'dxos.org/type/AccessToken',
    version: '0.1.0',
  }),
  Schema.annotations({
    description: 'A credential or token for accessing a service.',
  }),
<<<<<<< HEAD
  Annotation.SystemTypeAnnotation.set(true),
||||||| 87517e966b
=======
  SystemTypeAnnotation.set(true),
>>>>>>> origin/main
);

export interface AccessToken extends Schema.Schema.Type<typeof AccessToken> {}

export const make = (props: Obj.MakeProps<typeof AccessToken>) => Obj.make(AccessToken, props);
