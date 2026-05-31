//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { BlueprintsAnnotation } from '@dxos/app-toolkit';
import { Routine } from '@dxos/compute';
import { DXN, Annotation, Obj, Ref, StateMap, Type } from '@dxos/echo';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.magazine';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';

import * as Subscription from './Subscription';

/** Per-Post magazine-scoped curation state, keyed by Post id. */
export const PostState = Schema.Struct({
  /** Agent-assigned relevance within this magazine (lower = more relevant). */
  rank: Schema.optional(Schema.Number),
});
export type PostState = Schema.Schema.Type<typeof PostState>;

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
   * Per-Post magazine-scoped curation state (just `rank`), keyed by Post id. Shared per-Post state
   * (readAt, star/archive tags) lives on `Subscription`; snippet/imageUrl are derived from the Post
   * (or refined onto the Subscription's contentFeed entries).
   */
  postState: StateMap.field(PostState),
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
