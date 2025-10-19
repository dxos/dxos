//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

import { Person } from './person';

// TOOD(burdon): Rename; this is very specific to AI.
export const ActorRoles = ['user', 'assistant', 'tool'] as const;

export const ActorRole = Schema.Literal(...ActorRoles);
export type ActorRole = Schema.Schema.Type<typeof ActorRole>; // TODO(burdon): Remove.

/**
 * https://schema.org/actor
 */
export const Actor = Schema.Struct({
  contact: Schema.optional(Type.Ref(Person)),
  identityDid: Schema.optional(Schema.String),
  /** @deprecated */
  identityKey: Schema.optional(Schema.String),
  // TODO(burdon): Generalize to handle/identifier?
  email: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  role: Schema.optional(ActorRole),
});

export interface Actor extends Schema.Schema.Type<typeof Actor> {}
