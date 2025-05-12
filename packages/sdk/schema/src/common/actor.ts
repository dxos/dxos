//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';

import { Ref } from '@dxos/echo-schema';

import { Person } from './person';

// TOOD(burdon): Rename; this is very specific to AI.
export const ActorRoles = ['user', 'assistant'] as const;

export const ActorRole = Schema.Literal(...ActorRoles);
export type ActorRole = Schema.Schema.Type<typeof ActorRole>; // TODO(burdon): Remove.

/**
 * https://schema.org/actor
 */
export const Actor = Schema.Struct({
  contact: Schema.optional(Ref(Person)),
  identityDid: Schema.optional(Schema.String),
  /** @deprecated */
  identityKey: Schema.optional(Schema.String),
  // TODO(burdon): Generalize to handle/identifier?
  email: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  role: Schema.optional(ActorRole),
});
export interface Actor extends Schema.Schema.Type<typeof Actor> {}
