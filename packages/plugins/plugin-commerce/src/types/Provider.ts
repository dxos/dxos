//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Annotation, DXN, JsonSchema, Obj, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

export const SKILL_KEY = 'org.dxos.plugin.commerce/skill/provider';

/** Binds a request parameter to a search-schema field, with an optional transform hint. */
export const FieldBinding = Schema.Struct({
  field: Schema.String,
  // Optional transform, e.g. 'min' | 'max' for a range field, or a format template.
  transform: Schema.optional(Schema.String),
});
export type FieldBinding = Schema.Schema.Type<typeof FieldBinding>;

/** How to turn criteria into an HTTP request. */
export const RequestMapping = Schema.Struct({
  method: Schema.Literal('GET', 'POST'),
  urlTemplate: Schema.String,
  query: Schema.optional(Schema.Record({ key: Schema.String, value: FieldBinding })),
  body: Schema.optional(Schema.Record({ key: Schema.String, value: FieldBinding })),
  headers: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.String })),
});
export type RequestMapping = Schema.Schema.Type<typeof RequestMapping>;

/** Extracts a single field relative to a located item. */
export const FieldExtractor = Schema.Struct({
  // CSS selector (html) relative to the item; omit to use the item element itself.
  selector: Schema.optional(Schema.String),
  // HTML attribute to read (e.g. 'href', 'src'); omit for text content.
  attr: Schema.optional(Schema.String),
  // JSONPath (json responses) relative to the item.
  path: Schema.optional(Schema.String),
});
export type FieldExtractor = Schema.Schema.Type<typeof FieldExtractor>;

/** How to turn an HTTP response into result objects. */
export const ResultMapping = Schema.Struct({
  responseType: Schema.Literal('html', 'json'),
  // CSS selector (html) or JSONPath (json) selecting each listing.
  itemLocator: Schema.String,
  fields: Schema.Record({ key: Schema.String, value: FieldExtractor }),
});
export type ResultMapping = Schema.Schema.Type<typeof ResultMapping>;

/** A configured search provider (API or scrape target). */
export const Provider = Schema.Struct({
  name: Schema.String.pipe(Schema.annotations({ title: 'Name' })),
  url: Schema.String.pipe(Schema.annotations({ title: 'URL' })),
  description: Schema.optional(Schema.String),
  kind: Schema.Literal('api', 'scrape').pipe(Schema.annotations({ title: 'Kind' })),
  // Raw JSONSchema of the typed search fields; authored by the skill and hidden from forms
  // (it is converted to an Effect Schema to drive the Search criteria form).
  searchSchema: JsonSchema.JsonSchema.pipe(FormInputAnnotation.set(false), Schema.optional),
  // Mapping structs are Effect Schemas and render as nested form fields in the Provider editor.
  request: Schema.optional(RequestMapping),
  result: Schema.optional(ResultMapping),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--package--regular', hue: 'cyan' }),
  AppAnnotation.SkillsAnnotation.set([SKILL_KEY]),
  Type.makeObject(DXN.make('org.dxos.type.commerce.Provider', '0.1.0')),
);
export type Provider = Type.InstanceType<typeof Provider>;

/** Checks if a value is a Provider object. */
export const instanceOf = (value: unknown): value is Provider => Obj.instanceOf(Provider, value);

/** Creates a Provider. */
export const make = (props: Obj.MakeProps<typeof Provider>): Provider => Obj.make(Provider, props);
