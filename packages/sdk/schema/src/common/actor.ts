//
// Copyright 2025 DXOS.org
//

import { Ref, S } from '@dxos/echo-schema';

import { Person } from './person';

export const ActorRoles = ['user', 'assistant'] as const;

export const ActorRole = S.Literal(...ActorRoles);
export type ActorRole = S.Schema.Type<typeof ActorRole>;

/**
 * https://schema.org/actor
 */
export const Actor = S.Struct({
  contact: S.optional(Ref(Person)),
  identityDid: S.optional(S.String),
  /** @deprecated */
  identityKey: S.optional(S.String),
  // TODO(burdon): Generalize to handle/identifier?
  email: S.optional(S.String),
  name: S.optional(S.String),
  role: S.optional(ActorRole),
});

export interface Actor extends S.Schema.Type<typeof Actor> {}
