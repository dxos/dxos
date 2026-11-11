//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Ref, Type } from '@dxos/echo';

// #region organization
export class Organization extends Type.makeObject<Organization>(
  DXN.make('com.example.type.organization', '0.1.0'),
)(
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
// #endregion

// #region person
export class Person extends Type.makeObject<Person>(
  DXN.make('com.example.type.person', '0.1.0'),
)(
  Schema.Struct({
    name: Schema.String,
    email: Schema.optional(Format.Email),
    employer: Schema.optional(Ref.Ref(Organization)),
  }).pipe(
    Annotation.IconAnnotation.set({ icon: 'ph--user--regular', hue: 'cyan' }),
  ),
) {}
// #endregion

// #region event
export class Event extends Type.makeObject<Event>(
  DXN.make('com.example.type.event', '0.1.0'),
)(
  Schema.Struct({
    title: Schema.String,
    description: Schema.optional(Schema.String),
    attendees: Schema.optional(Schema.Array(Ref.Ref(Person))),
  }).pipe(
    Annotation.IconAnnotation.set({
      icon: 'ph--calendar-dots--regular',
      hue: 'green',
    }),
    Annotation.LabelAnnotation.set(['title']),
  ),
) {}
// #endregion

// #region types
export const types = [Organization, Person, Event];
// #endregion

export type ContactRecord = Organization | Person | Event;

// #region follow
/** The name of the organization `person` works for, if it is loaded. */
export const employerName = (person: Person): string | undefined =>
  person.employer?.peek()?.name;
// #endregion

/** The glyph and hue a type declares on its schema. */
export const getTypeIcon = (
  type: Type.AnyObj,
): Annotation.IconAnnotation | undefined =>
  Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(type)));
