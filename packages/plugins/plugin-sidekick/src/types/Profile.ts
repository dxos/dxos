//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';

export class Profile extends Type.makeObject<Profile>(DXN.make('org.dxos.type.sidekick.profile', '0.1.0'))(
  Schema.Struct({
    subject: Ref.Ref(Obj.Unknown),
    document: Ref.Ref(Obj.Unknown),
    autoRespond: Schema.optional(Schema.Boolean),
    createDraft: Schema.optional(Schema.Boolean),
    researchEnabled: Schema.optional(Schema.Boolean),
    lastUpdated: Schema.optional(Schema.String),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--user-circle--regular', hue: 'cyan' }),
  ),
) {}

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
