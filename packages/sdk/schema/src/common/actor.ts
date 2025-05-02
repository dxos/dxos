//
// Copyright 2025 DXOS.org
//

import { Ref, S } from '@dxos/echo-schema';

import { Contact } from './contact';

export const ActorRoles = ['user', 'assistant'] as const;
export const ActorRole = S.Literal(...ActorRoles);
export type ActorRole = S.Schema.Type<typeof ActorRole>;

export const ActorSchema = S.Struct({
  contact: S.optional(Ref(Contact)),
  identityDid: S.optional(S.String),
  /** @deprecated */
  identityKey: S.optional(S.String),
  // TODO(burdon): Generalize to handle/identifier?
  email: S.optional(S.String),
  name: S.optional(S.String),
  role: S.optional(ActorRole),
});
