//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { BlueprintsAnnotation, StateMap } from '@dxos/app-toolkit';
import { Blueprint, Routine } from '@dxos/compute';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { type EntityId } from '@dxos/keys';

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
 * The user points the Magazine at a Routine that describes what content to
 * gather. A curation flow reads the Routine's instructions, selects matching
 * Posts, enriches them with snippet and hero image, and appends their refs here.
 */
export const Magazine = Schema.Struct({
  /** User-facing title of the magazine. */
  name: Schema.String.pipe(Schema.optional),
  /** Feeds to pull content from. */
  feeds: Schema.Array(Ref.Ref(Subscription.Subscription)),
  /** Curated Post refs (insertion order; UI displays newest-last reversed). */
  posts: Schema.Array(Ref.Ref(Subscription.Post)).pipe(FormInputAnnotation.set(false)),
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
  /** Routine describing what content the Magazine should gather (hidden from forms; edited via properties companion). */
  routine: Schema.optional(Ref.Ref(Routine.Routine).pipe(FormInputAnnotation.set(false))),
}).pipe(
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--newspaper-clipping--regular', hue: 'indigo' }),
  BlueprintsAnnotation.set([BLUEPRINT_KEY]),
  Type.makeObject(DXN.make('org.dxos.type.magazine', '0.1.0')),
);

export type Magazine = Type.InstanceType<typeof Magazine>;

/** Checks if a value is a Magazine object. */
export const instanceOf = (value: unknown): value is Magazine => Obj.instanceOf(Magazine, value);

/** Default curation instructions seeded into every new Magazine's Routine. */
export const DEFAULT_MAGAZINE_INSTRUCTIONS = '';

export type MakeProps = Omit<Obj.MakeProps<typeof Magazine>, 'feeds' | 'posts'> & {
  feeds?: Ref.Ref<Subscription.Subscription>[];
  posts?: Ref.Ref<Subscription.Post>[];
  routine?: { instructions?: string };
  blueprint?: Ref.Ref<Blueprint.Blueprint>;
};

/**
 * Creates a Magazine together with its companion Routine (hidden child, cascade-deleted with the magazine).
 * The routine is pre-wired with the provided blueprint and a self-reference context so it can be
 * passed directly to AgentPrompt without constructing an ephemeral wrapper.
 */
export const make = (props: MakeProps = {}): { magazine: Magazine; routine: Routine.Routine } => {
  const magazine = Obj.make(Magazine, {
    name: props.name,
    feeds: props.feeds ?? [],
    posts: props.posts ?? [],
    keep: props.keep,
  });
  const routine = Routine.make({
    instructions: props.routine?.instructions ?? DEFAULT_MAGAZINE_INSTRUCTIONS,
    blueprints: props.blueprint ? [props.blueprint] : [],
    context: [Ref.make(magazine)],
  });
  Obj.setParent(routine, magazine);
  Obj.update(magazine, (magazine) => {
    (magazine as Obj.Mutable<typeof magazine>).routine = Ref.make(routine);
  });
  return { magazine, routine };
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
