//
// Copyright 2025 DXOS.org
//

import { Ref, S, TypedObject } from '@dxos/echo-schema';

// TODO(wittjosiah): Factor out to halo?
export class ContactType extends TypedObject({ typename: 'dxos.org/type/Contact', version: '0.1.0' })({
  name: S.optional(S.String),
  identifiers: S.mutable(
    S.Array(
      S.Struct({
        type: S.String,
        value: S.String,
      }),
    ),
  ),
}) {}

export const ActorRoles = ['user', 'assistant'] as const;
export const ActorRole = S.Literal(...ActorRoles);
export type ActorRole = S.Schema.Type<typeof ActorRole>;

export const ActorSchema = S.Struct({
  contact: S.optional(Ref(ContactType)),
  // TODO(wittjosiah): Should the below fields just be the contact schema?
  //  i.e. it should either be a reference to an existing contact or an inline contact schema.
  identityKey: S.optional(S.String),
  // TODO(burdon): Generalize to handle/identifier?
  email: S.optional(S.String),
  name: S.optional(S.String),
  role: S.optional(ActorRole),
});
