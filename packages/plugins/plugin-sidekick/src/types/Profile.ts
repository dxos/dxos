//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Obj, Ref, Type } from '@dxos/echo';

export const Profile = Schema.Struct({
  subject: Ref.Ref(Obj.Unknown),
  document: Ref.Ref(Obj.Unknown),
  autoRespond: Schema.optional(Schema.Boolean),
  createDraft: Schema.optional(Schema.Boolean),
  researchEnabled: Schema.optional(Schema.Boolean),
  lastUpdated: Schema.optional(Schema.String),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.sidekick.profile',
    version: '0.1.0',
  }),
  Annotation.IconAnnotation.set({
    icon: 'ph--user-circle--regular',
    hue: 'cyan',
  }),
);

export interface Profile extends Schema.Schema.Type<typeof Profile> {}

/** Creates a sidekick profile with default capability flags and timestamp metadata. */
export const make = (props: { subject: Ref.Ref<Obj.Unknown>; document: Ref.Ref<Obj.Unknown> }) =>
  Obj.make(Profile, {
    subject: props.subject,
    document: props.document,
    autoRespond: false,
    createDraft: false,
    researchEnabled: false,
    lastUpdated: new Date().toISOString(),
  });
