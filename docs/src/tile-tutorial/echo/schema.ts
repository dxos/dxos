//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Ref, Type } from '@dxos/echo';

// The ECHO tutorial's types, unchanged; see /docs/echo/learn/defining-types/.

export class Organization extends Type.makeObject<Organization>(DXN.make('com.example.type.organization', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    website: Schema.optional(Format.URL),
  }).pipe(
    Annotation.IconAnnotation.set({
      icon: 'ph--buildings--regular',
      hue: 'amber',
    }),
  ),
) {}

// #region person
export class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    email: Schema.optional(Format.Email),
    employer: Schema.optional(Ref.Ref(Organization)),
  }).pipe(Annotation.IconAnnotation.set({ icon: 'ph--user--regular', hue: 'cyan' })),
) {}
// #endregion
