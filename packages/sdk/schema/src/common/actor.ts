//
// Copyright 2025 DXOS.org
//

import { EchoObject, Ref, S } from '@dxos/echo-schema';

// TODO(wittjosiah): Factor out to halo?
export const ContactType = S.Struct({
  name: S.optional(S.String),
  identifiers: S.mutable(
    S.Array(
      S.Struct({
        type: S.String,
        value: S.String,
      }),
    ),
  ),
}).pipe(EchoObject('dxos.org/type/Contact', '0.1.0'));
export type ContactType = S.Schema.Type<typeof ContactType>;

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
