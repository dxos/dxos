//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Obj, Type } from '@dxos/echo';
import { LabelAnnotation } from '@dxos/echo/internal';
import { type PageAction } from '@dxos/plugin-crx/types';

const EXCERPT_LENGTH = 280;

/** A saved web page. */
export const Bookmark = Schema.Struct({
  title: Schema.String.pipe(Schema.annotations({ title: 'Title' })),
  url: Schema.String.pipe(Schema.annotations({ title: 'URL' })),
  favicon: Schema.optional(Schema.String),
  image: Schema.optional(Schema.String),
  excerpt: Schema.optional(Schema.String),
  summary: Schema.optional(Schema.String),
  createdAt: Schema.String,
}).pipe(
  LabelAnnotation.set(['title']),
  Annotation.IconAnnotation.set({ icon: 'ph--bookmark-simple--regular', hue: 'amber' }),
  Type.makeObject(DXN.make('org.dxos.type.bookmark', '0.1.0')),
);
export type Bookmark = Type.InstanceType<typeof Bookmark>;

/** Creates a Bookmark object. */
export const make = (props: Obj.MakeProps<typeof Bookmark>): Bookmark => Obj.make(Bookmark, props);

/**
 * Best-effort mapping from a page-action snapshot. Missing fields are left
 * unset rather than blocking creation.
 */
export const fromSnapshot = (snapshot: PageAction.Snapshot): Bookmark =>
  make({
    title: snapshot.hints?.ogTitle ?? snapshot.source.title,
    url: snapshot.source.url,
    favicon: snapshot.source.favicon,
    image: snapshot.hints?.ogImage,
    excerpt: snapshot.hints?.ogDescription ?? snapshot.selection?.text?.slice(0, EXCERPT_LENGTH),
    createdAt: snapshot.source.clippedAt,
  });
