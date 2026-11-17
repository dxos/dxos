//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

// The Composer Worker imports this module, so it depends only on `effect`, never on ECHO.

export const MAX_TITLE_LENGTH = 120;

export const MAX_DESCRIPTION_LENGTH = 280;

/** Bounds a name, label, icon id or hue. */
export const MAX_NAME_LENGTH = 200;

/** Past this many, a type is too small a share of the preview's bar to see. */
export const MAX_TYPES = 24;

const Text = (maxLength: number) => Schema.String.pipe(Schema.check(Schema.isMaxLength(maxLength)));

const Name = Text(MAX_NAME_LENGTH);

export const PreviewType = Schema.Struct({
  typename: Name,
  /** The type's name for `count` objects, as Composer shows it (`3 Documents`). */
  label: Name,
  /** Phosphor icon id (`ph--file-text--regular`). */
  icon: Schema.optional(Name),
  hue: Schema.optional(Name),
  count: Schema.Number.pipe(Schema.check(Schema.isInt()), Schema.check(Schema.isGreaterThan(0))),
});
export interface PreviewType extends Schema.Schema.Type<typeof PreviewType> {}

export const PreviewObject = Schema.Struct({
  title: Text(MAX_TITLE_LENGTH),
  /** The type's singular name (`Document`). */
  type: Name,
  icon: Schema.optional(Name),
  hue: Schema.optional(Name),
  description: Schema.optional(Text(MAX_DESCRIPTION_LENGTH)),
});
export interface PreviewObject extends Schema.Schema.Type<typeof PreviewObject> {}

export const Preview = Schema.Struct({
  description: Schema.optional(Text(MAX_DESCRIPTION_LENGTH)),
  /** Phosphor icon id of the space. */
  icon: Schema.optional(Name),
  hue: Schema.optional(Name),
  /** Most numerous first. */
  types: Schema.Array(PreviewType).pipe(Schema.check(Schema.isMaxLength(MAX_TYPES))),
  /** Titled objects, by object id. */
  objects: Schema.Record(Schema.String, PreviewObject),
});
export interface Preview extends Schema.Schema.Type<typeof Preview> {}

export const Manifest = Schema.Struct({
  version: Schema.Literal(1),
  name: Schema.optional(Name),
  publishedAt: Schema.String,
  /** NSIDs the space enables (`space.properties.plugins`); recorded, never enabled automatically. */
  plugins: Schema.Array(Schema.String),
  /** Ids of every object in the bake. */
  objects: Schema.Array(Schema.String),
  preview: Schema.optional(Preview),
});
export interface Manifest extends Schema.Schema.Type<typeof Manifest> {}

export const FORK_PARAM = 'fork';

/** Query param carrying the object path (`db/<typeSlug>+<objectId>`) to open after a fork. */
export const PATH_PARAM = 'path';

export const VIEWER_PARAM = 'p';

export const PUBLICATIONS_PATH = '/publications';

export const EDGE_PUBLICATIONS_PATH = '/db/publications';
