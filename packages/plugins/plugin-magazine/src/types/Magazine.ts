//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Template } from '@dxos/compute';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type EntityId } from '@dxos/keys';
import { StateMap } from '@dxos/schema';

import * as Subscription from './Subscription';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.magazine';

/** Per-Post magazine-scoped curation state, keyed by Post id. */
export const PostState = Schema.Struct({
  /** Agent-assigned relevance within this magazine (lower = more relevant). */
  rank: Schema.optional(Schema.Number),
  /** Agent-written concise snippet summarising the article in the context of this magazine's topic. */
  snippet: Schema.optional(Schema.String),
  /** Agent-selected hero image URL for this post in this magazine. */
  imageUrl: Schema.optional(Schema.String),
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
  /** Topic instructions — what content this magazine should cover. Edited via the properties companion. */
  // TODO(burdon): Replace with Routine + Automation.
  instructions: Template.Template.pipe(FormInputAnnotation.set(false)),
  /**
   * Per-Post magazine-scoped curation state, keyed by Post id. Shared per-Post state (readAt,
   * star/archive tags) lives on `Subscription`; snippet/imageUrl here are agent-written at
   * curation time and take precedence over the RSS-derived defaults in display.
   */
  postState: Ref.Ref(StateMap.StateMap).pipe(FormInputAnnotation.set(false)),
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
  Annotation.IconAnnotation.set({ icon: 'ph--book-open-text--regular', hue: 'indigo' }),
  AppAnnotation.BlueprintsAnnotation.set([BLUEPRINT_KEY]),
  Type.makeObject(DXN.make('org.dxos.type.magazine', '0.1.0')),
);

export type Magazine = Type.InstanceType<typeof Magazine>;

/** Checks if a value is a Magazine object. */
export const instanceOf = (value: unknown): value is Magazine => Obj.instanceOf(Magazine, value);

export type MakeProps = Omit<Obj.MakeProps<typeof Magazine>, 'feeds' | 'posts' | 'instructions' | 'postState'> & {
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
  const instructions = Template.make({ source: props.instructions ?? '' });
  const postState = StateMap.make();
  const magazine = Obj.make(Magazine, {
    name: props.name,
    feeds: props.feeds ?? [],
    posts: props.posts ?? [],
    keep: props.keep,
    instructions,
    postState: Ref.make(postState),
  });
  // Cascade-delete the backing Text and per-Post state with the magazine.
  Obj.setParent(instructions.source.target!, magazine);
  Obj.setParent(postState, magazine);
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
// Per-Post magazine-scoped curation state, keyed by Post id.
//

/** Agent-assigned relevance of a Post within a Magazine, or undefined. */
export const getRank = (magazine: Magazine | undefined, postId: EntityId): number | undefined => {
  const stateMap = magazine?.postState.target;
  return stateMap ? StateMap.bind<PostState>(stateMap).get(postId).rank : undefined;
};

/** Returns the full magazine-scoped {@link PostState} for a Post, or an empty record. */
export const getPostState = (magazine: Magazine | undefined, postId: EntityId): Partial<PostState> => {
  const stateMap = magazine?.postState.target;
  return stateMap ? StateMap.bind<PostState>(stateMap).get(postId) : {};
};

/** Merges partial state into a Post's magazine-scoped {@link PostState}. */
export const patchPostState = (magazine: Magazine, postId: EntityId, state: Partial<PostState>): void => {
  const stateMap = magazine.postState.target;
  if (stateMap) {
    StateMap.bind<PostState>(stateMap).patch(postId, state);
  }
};

/** Sets the magazine-scoped rank for a Post. */
export const setRank = (magazine: Magazine, postId: EntityId, rank: number): void =>
  patchPostState(magazine, postId, { rank });
