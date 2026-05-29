//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

export const BLUEPRINT_KEY = 'org.dxos.plugin.product-search/blueprint/provider';

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
