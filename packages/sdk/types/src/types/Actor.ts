//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Obj, Ref } from '@dxos/echo';

import * as Person from './Person.ts';

// TOOD(burdon): This is very specific to AI.
export const Role = Schema.Literals(['user', 'assistant', 'tool']);
export type Role = Schema.Schema.Type<typeof Role>;

/**
 * https://schema.org/actor
 */
export const Actor = Schema.Struct({
  role: Schema.optional(Role),
  contact: Schema.optional(Ref.Ref(Person.Person)),
  identityDid: Schema.optional(Schema.String),
  /** @deprecated */
  identityKey: Schema.optional(Schema.String),
  // TODO(burdon): Generalize to handle/identifier?
  email: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
  /**
   * The object this actor stands for, when it is not a person — an agent session, a service, a
   * bot. Deliberately untyped: an actor is a role in someone else's schema (a task's assignee, a
   * message's author), so naming the concrete types here would make every such schema depend on
   * them, and the set is open by construction.
   */
  subject: Schema.optional(Ref.Ref(Obj.Unknown)),
});

export type Actor = Schema.Schema.Type<typeof Actor>;
