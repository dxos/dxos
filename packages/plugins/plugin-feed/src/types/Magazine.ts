//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { BlueprintsAnnotation, StateMap } from '@dxos/app-toolkit';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { type EntityId } from '@dxos/keys';
import { Text } from '@dxos/schema';

import * as Subscription from './Subscription';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.magazine';

/** Per-Post magazine-scoped curation state, keyed by Post id. */
export const PostState = Schema.Struct({
  /** Agent-assigned relevance within this magazine (lower = more relevant). */
  rank: Schema.optional(Schema.Number),
});
export type PostState = Schema.Schema.Type<typeof PostState>;

/**
 * An agent-curated collection of articles drawn from one or more Feeds.
 * The Magazine carries the user's topic instructions ("what this magazine is
 * about"); the {@link CurateMagazine} operation combines them at curation time
 * with the plugin's base methodology (the Magazine blueprint) to select matching
 * Posts and append their refs here.
 */
export const Magazine = Schema.Struct({
  /** User-facing title of the magazine. */
  name: Schema.String.pipe(Schema.optional),
  /** Feeds to pull content from. */
  feeds: Schema.Array(Ref.Ref(Subscription.Subscription)),
  /** Curated Post refs (insertion order; UI displays newest-last reversed). */
  posts: Schema.Array(Ref.Ref(Subscription.Post)).pipe(FormInputAnnotation.set(false)),
  /**
   * The user's topic instructions — what content this Magazine should cover. The base curation
   * methodology (how to select and dedup, the output contract) lives in the Magazine blueprint and
   * is applied automatically at curation time; this field holds only the magazine-specific topic.
   * Edited via the properties companion.
   */
  instructions: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
  /**
   * Per-Post magazine-scoped curation state (just `rank`), keyed by Post id. Shared per-Post state
   * (readAt, star/archive tags) lives on `Subscription`; snippet/imageUrl are derived from the Post
   * (or refined onto the Subscription's contentFeed entries).
   */
  postState: StateMap.field(PostState),
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
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--newspaper-clipping--regular', hue: 'indigo' }),
  BlueprintsAnnotation.set([BLUEPRINT_KEY]),
  Type.makeObject(DXN.make('org.dxos.type.magazine', '0.1.0')),
);

export type Magazine = Type.InstanceType<typeof Magazine>;

/** Checks if a value is a Magazine object. */
export const instanceOf = (value: unknown): value is Magazine => Obj.instanceOf(Magazine, value);

export type MakeProps = Omit<Obj.MakeProps<typeof Magazine>, 'feeds' | 'posts' | 'instructions'> & {
  feeds?: Ref.Ref<Subscription.Subscription>[];
  posts?: Ref.Ref<Subscription.Post>[];
  /** The user's topic instructions (what this magazine should cover). */
  instructions?: string;
};

/**
 * Creates a Magazine with its topic-instructions Text as a hidden child (cascade-deleted with the
 * magazine). The base curation methodology lives in the Magazine blueprint and is attached to the
 * in-memory routine at curation time, so no Routine object is persisted here.
 */
export const make = (props: MakeProps = {}): Magazine => {
  const instructions = Text.make({ content: props.instructions ?? '' });
  const magazine = Obj.make(Magazine, {
    name: props.name,
    feeds: props.feeds ?? [],
    posts: props.posts ?? [],
    keep: props.keep,
    instructions: Ref.make(instructions),
  });
  Obj.setParent(instructions, magazine);
  return magazine;
};

/** Schema for the create-magazine dialog form. */
export const CreateMagazineSchema = Schema.Struct({
  name: Schema.optional(
    Schema.String.annotations({
      title: 'Name',
    }),
  ),
  feeds: Schema.Array(Ref.Ref(Subscription.Subscription)).annotations({
    title: 'Feeds',
  }),
  instructions: Schema.optional(
    Schema.String.annotations({
      title: 'Instructions',
      description: 'Describe what content to curate.',
    }),
  ),
});

//
// Per-Post magazine-scoped curation state (rank), keyed by Post id.
//

/** Agent-assigned relevance of a Post within a Magazine, or undefined. */
export const getRank = (magazine: Magazine | undefined, postId: EntityId): number | undefined =>
  magazine ? StateMap.bind<PostState>(magazine, 'postState').get(postId).rank : undefined;

/** Sets the magazine-scoped rank for a Post. */
export const setRank = (magazine: Magazine, postId: EntityId, rank: number): void =>
  StateMap.bind<PostState>(magazine, 'postState').patch(postId, { rank });
