//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { BlueprintsAnnotation } from '@dxos/app-toolkit';
import { Routine } from '@dxos/compute';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.magazine';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

import * as Subscription from './Subscription';

/**
 * An agent-curated collection of articles drawn from one or more Feeds.
 * The user points the Magazine at a Routine that describes what content to
 * gather. A curation flow reads the Routine's instructions, selects matching
 * Posts, enriches them with snippet and hero image, and appends their refs here.
 */
export const Magazine = Schema.Struct({
  /** User-facing title of the magazine. */
  name: Schema.String.pipe(Schema.optional),
  /** Feeds to pull content from. */
  feeds: Schema.Array(Ref.Ref(Subscription.Subscription)),
  /** Routine describing what content the Magazine should gather. */
  routine: Schema.optional(Ref.Ref(Routine.Routine).pipe(Schema.annotations({ title: 'Routine' }))),
  /**
   * Maximum number of (non-starred) curated Posts retained on the magazine after curation.
   * Older posts beyond this bound are dropped; starred posts are preserved regardless.
   * Defaults to {@link Subscription.DEFAULT_KEEP} when unset.
   */
  keep: Schema.Number.pipe(
    Schema.annotations({
      title: 'Keep',
      description: 'Number of items to keep.',
    }),
    Schema.optional,
  ),
  /** Curated Post refs (insertion order; UI displays newest-last reversed). */
  posts: Schema.Array(Ref.Ref(Subscription.Post)).pipe(FormInputAnnotation.set(false)),
  /**
   * Per-Post magazine-scoped curation cache, keyed by Post id. The Post itself
   * lives in a Subscription's queue and is immutable; this side map carries the
   * magazine-specific curation outputs so the feed item is never mutated or
   * copied into space.db.
   *
   * - `snippet`: agent/curation-extracted summary; different magazines (with
   *   different prompts / instructions) may produce different snippets for the
   *   same Post.
   * - `rank`: agent-assigned relevance within this magazine; intrinsically
   *   magazine-scoped.
   *
   * Per-Post state shared across magazines (readAt, archived, starred,
   * content, imageUrl) lives on `Subscription.postState` keyed by Post id.
   */
  postState: Schema.Record({
    key: Schema.String,
    value: Schema.Struct({
      snippet: Schema.optional(Schema.String),
      rank: Schema.optional(Schema.Number),
    }),
  }).pipe(FormInputAnnotation.set(false), Schema.optional),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--newspaper-clipping--regular',
    hue: 'indigo',
  }),
  BlueprintsAnnotation.set([BLUEPRINT_KEY]),
  Type.makeObject(DXN.make('org.dxos.type.magazine', '0.1.0')),
);

export type Magazine = Type.InstanceType<typeof Magazine>;

/** Checks if a value is a Magazine object. */
export const instanceOf = (value: unknown): value is Magazine => Obj.instanceOf(Magazine, value);

/** Creates a Magazine. */
export const make = (
  props: Omit<Obj.MakeProps<typeof Magazine>, 'feeds' | 'posts'> & {
    feeds?: Ref.Ref<Subscription.Subscription>[];
    posts?: Ref.Ref<Subscription.Post>[];
  } = {},
): Magazine =>
  Obj.make(Magazine, {
    ...props,
    feeds: props.feeds ?? [],
    posts: props.posts ?? [],
  });

/** Schema for the create-magazine dialog form. */
export const CreateMagazineSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
    }),
  ),
});
