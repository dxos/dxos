//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { AccessToken } from '@dxos/types';

export const SKILL_KEY = 'org.dxos.skill.sandbox';

/**
 * ECHO object representing a persistent sandbox environment.
 * The object id is used as the sandbox id in the sandbox service.
 */
export class Sandbox extends Type.makeObject<Sandbox>(DXN.make('org.dxos.type.sandbox', '0.1.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    baseImage: Schema.optional(Schema.String),
    createdAt: Schema.optional(Schema.String),
    expiresAt: Schema.optional(Schema.String),
    credentials: Schema.optional(
      Schema.Array(
        Schema.Struct({
          env: Schema.String,
          token: Ref.Ref(AccessToken.AccessToken),
        }),
      ),
    ),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--terminal--regular', hue: 'green' })),
) {}

/**
 * Constructs a `Sandbox` ECHO object from the given props.
 */
export const make = (props: Obj.MakeProps<typeof Sandbox>): Sandbox => Obj.make(Sandbox, props);
