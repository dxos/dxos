//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Type } from '@dxos/echo';

import * as Person from './Person';

// TOOD(burdon): This is very specific to AI.
export const Role = Schema.Literal('user', 'assistant', 'tool');
export type Role = Schema.Schema.Type<typeof Role>;

/**
 * https://schema.org/actor
 */
export const Actor = Schema.Struct({
  contact: Schema.optional(Type.Ref(Person.Person)),
  identityDid: Schema.optional(Schema.String),
  /** @deprecated */
  identityKey: Schema.optional(Schema.String),
  // TODO(burdon): Generalize to handle/identifier?
  email: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  role: Schema.optional(Role),
});

export interface Actor extends Schema.Schema.Type<typeof Actor> {}
