//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

/** One feature of the feature map, as the page of the spec it cites lists it. */
export const WikiFeature = Schema.Struct({
  id: Schema.String,
  title: Schema.String,
  status: Schema.optional(Schema.String),
});
export type WikiFeature = Schema.Schema.Type<typeof WikiFeature>;

/** One spec, rendered as a wiki page: the spec's prose, with each `mdl` block reduced to a one-line summary. */
export const WikiPage = Schema.Struct({
  /** Repo-relative path of the spec, e.g. `packages/plugins/plugin-markdown/PLUGIN.mdl`. */
  path: Schema.String,
  title: Schema.String,
  /** The spec's opening paragraph, one line. */
  summary: Schema.String,
  features: Schema.Array(WikiFeature),
  /** Markdown body; a cited spec path appears as `{{spec:<path>}}`, which the partial turns into a link. */
  content: Schema.String,
});
export type WikiPage = Schema.Schema.Type<typeof WikiPage>;

/** A `### <area>` section of the feature map and the pages of the specs its features cite. */
export const WikiArea = Schema.Struct({
  name: Schema.String,
  pages: Schema.Array(WikiPage),
});
export type WikiArea = Schema.Schema.Type<typeof WikiArea>;

/** The wiki as `scripts/generate-wiki.ts` writes it to `wiki.json`. */
export const Wiki = Schema.Struct({
  /** The feature map's opening paragraph. */
  intro: Schema.String,
  areas: Schema.Array(WikiArea),
});
export type Wiki = Schema.Schema.Type<typeof Wiki>;

/** The placeholder a page body carries for a link to another page, by spec path. */
export const SPEC_LINK = /\{\{spec:([^}]+)\}\}/g;
