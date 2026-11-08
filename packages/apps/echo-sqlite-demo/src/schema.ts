//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { Annotation, Format, Ref, Type } from '@dxos/echo';
import * as SchemaAST from '@dxos/effect/SchemaAST';
import * as SchemaEx from '@dxos/effect/SchemaEx';
import { DXN } from '@dxos/keys';

/**
 * The whole data model. This is what a developer writes to get a graph: two types and a reference
 * between them, and the queries, reactivity and full-text search in the app come from these.
 *
 * The annotations carry how a type presents itself — its name and its glyph — so no view keeps a
 * table of either, and a new type shows up correctly everywhere the moment it is declared here.
 */

export class Organization extends Type.makeObject<Organization>(DXN.make('com.example.type.organization', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    website: Schema.optional(Format.URL),
  })
    .pipe(Annotation.IconAnnotation.set({ icon: 'ph--buildings--regular', hue: 'amber' }))
    .annotate({ title: 'Organization' }),
) {}

export class Person extends Type.makeObject<Person>(DXN.make('com.example.type.person', '0.1.0'))(
  Schema.Struct({
    name: Schema.String,
    email: Schema.Array(Schema.String),
    /** The edge that makes this a graph rather than two tables. */
    employer: Schema.optional(Ref.Ref(Organization)),
  })
    .pipe(Annotation.IconAnnotation.set({ icon: 'ph--user--regular', hue: 'cyan' }))
    .annotate({ title: 'Person' }),
) {}

export const types = [Organization, Person];

/** The glyph and hue a type declares, for a row, a card or a graph node. */
export const getTypeIcon = (type: Type.AnyEntity): Annotation.IconAnnotation | undefined =>
  Option.getOrUndefined(Annotation.IconAnnotation.get(Type.getSchema(type)));

/** The type's own name, falling back to its typename. */
export const getTypeTitle = (type: Type.AnyEntity): string =>
  SchemaEx.getAnnotation<string>(SchemaAST.TitleAnnotationId)(Type.getSchema(type).ast) ?? Type.getTypename(type)!;
