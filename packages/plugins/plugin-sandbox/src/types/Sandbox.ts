//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.sandbox';

/**
 * ECHO object representing a persistent sandbox environment.
 * The object id is used as the sandbox id in the sandbox service.
 */
export const Sandbox = Schema.Struct({
  name: Schema.optional(Schema.String),
  baseImage: Schema.optional(Schema.String),
  createdAt: Schema.optional(Schema.String),
  expiresAt: Schema.optional(Schema.String),
}).pipe(
  Annotation.IconAnnotation.set({
    icon: 'ph--terminal--regular',
    hue: 'green',
  }),
  Type.makeObject(DXN.make('org.dxos.type.sandbox', '0.1.0')),
);

export type Sandbox = Type.InstanceType<typeof Sandbox>;

/**
 * Constructs a `Sandbox` ECHO object from the given props.
 */
export const make = (props: Obj.MakeProps<typeof Sandbox>): Sandbox => Obj.make(Sandbox, props);
