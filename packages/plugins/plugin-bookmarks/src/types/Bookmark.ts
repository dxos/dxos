//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type PageAction } from '@dxos/plugin-crx/types';
import { Text } from '@dxos/schema';

const EXCERPT_LENGTH = 280;

/** A saved web page. */
export class Bookmark extends Type.makeObject<Bookmark>(DXN.make('org.dxos.type.bookmark', '0.1.0'))(
  Schema.Struct({
    title: Schema.String.pipe(Schema.annotations({ title: 'Title' })),
    url: Schema.String.pipe(Schema.annotations({ title: 'URL' })),
    favicon: Schema.optional(Schema.String),
    image: Schema.optional(Schema.String),
    excerpt: Schema.optional(Schema.String),
    summary: Ref.Ref(Text.Text).pipe(
      Schema.annotations({ description: 'Generated summary.' }),
      FormInputAnnotation.set(false),
      Schema.optional,
    ),
  }).pipe(
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--bookmark-simple--regular', hue: 'amber' }),
  ),
) {}

/** Creates a Bookmark object. */
export const make = (props: Obj.MakeProps<typeof Bookmark>): Bookmark => Obj.make(Bookmark, props);

/** Checks if a value is a Bookmark object. */
export const instanceOf = (value: unknown): value is Bookmark => Obj.instanceOf(Bookmark, value);

/**
 * Best-effort mapping from a page-action snapshot. Missing fields are left
 * unset rather than blocking creation. Prefers the extension-captured
 * thumbnail data URL over the hotlinked og-image URL.
 *
 * `selection.text` outranks `hints.ogDescription` for the excerpt because a
 * selection is only present when the user explicitly picked or selected
 * content, making it a more precise signal than page-declared metadata.
 */
export const fromSnapshot = (snapshot: PageAction.Snapshot): Bookmark =>
  make({
    title: snapshot.hints?.ogTitle ?? snapshot.source.title,
    url: snapshot.source.url,
    favicon: snapshot.source.favicon,
    image: snapshot.imageData ?? snapshot.hints?.ogImage,
    excerpt: snapshot.selection?.text?.slice(0, EXCERPT_LENGTH) ?? snapshot.hints?.ogDescription,
  });
