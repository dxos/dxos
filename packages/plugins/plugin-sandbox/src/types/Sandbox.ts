//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Ref, Type } from '@dxos/echo';
import { AccessToken } from '@dxos/link';

import * as Repository from './Repository.ts';

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
    /** Repositories every command in the sandbox has as git remotes; the sandbox's work outlives it there. */
    repositories: Schema.optional(Schema.Array(Ref.Ref(Repository.Repository))),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--terminal--regular', hue: 'green' }),
    // Listed in the navtree like any object the reader owns, which is where its "Grant account access" action lives.
    Annotation.UserType.set(),
  ),
) {}

/**
 * Constructs a `Sandbox` ECHO object from the given props.
 */
export const make = (props: Obj.MakeProps<typeof Sandbox>): Sandbox => Obj.make(Sandbox, props);
