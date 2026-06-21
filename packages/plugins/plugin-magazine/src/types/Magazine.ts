//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Blueprint, Routine } from '@dxos/compute';
import { Database, DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type EntityId } from '@dxos/keys';
import { StateMap } from '@dxos/schema';
import { trim } from '@dxos/util';

import * as Subscription from './Subscription';

export const BLUEPRINT_KEY = 'org.dxos.blueprint.magazine';

/**
 * Default editorial methodology seeded into a Magazine's curation Routine. Describes WHAT to curate
 * (selection, dedup, snippet, hero image). The HOW (candidate input shape, tool usage, output
 * contract) lives in the Magazine blueprint, not here.
 */
export const DEFAULT_INSTRUCTIONS = trim`
  You curate articles for a Magazine around the Topic described below.

  Select only candidates that clearly match the Topic — quality over quantity.

  Never select duplicate articles. Two candidates are duplicates if they share a link or guid, or if
  their titles and content describe the same story (e.g. the same article syndicated by different
  feeds). Keep only one of each — prefer the most complete or authoritative source — and skip the rest.

  For each candidate you select, also produce:
  - A concise 1-2 sentence snippet (plain text, no markdown) capturing why the article is relevant to
    the Topic. If you read the full article, use it to write a richer snippet.
  - The best hero image URL for the article, when one is available.
`;

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
 * Curation is driven by a {@link Routine.Routine}: its instructions hold the editorial methodology
 * plus this magazine's topic, and it references the Magazine blueprint (the tool/output contract).
 * The {@link ensureRoutine} helper creates the Routine lazily on first curation, seeding it with the
 * default editorial instructions and the magazine's {@link topic}.
 */
export const Magazine = Schema.Struct({
  /** User-facing title of the magazine. */
  name: Schema.String.pipe(Schema.optional),
  /** Feeds to pull content from. */
  feeds: Schema.Array(Ref.Ref(Subscription.Subscription)),
  /** Curated Post refs (insertion order; UI displays newest-last reversed). */
  posts: Schema.Array(Ref.Ref(Subscription.Post)).pipe(FormInputAnnotation.set(false)),
  /**
   * Editorial seed captured from the create dialog. Woven into the Routine's instructions when the
   * Routine is created on first curation; thereafter the Routine's instructions are authoritative.
   */
  topic: Schema.String.pipe(FormInputAnnotation.set(false), Schema.optional),
  /**
   * Curation Routine, created lazily by {@link ensureRoutine} on first curation (absent until then).
   * Its instructions are edited via the properties companion.
   */
  routine: Ref.Ref(Routine.Routine).pipe(FormInputAnnotation.set(false), Schema.optional),
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
  Type.makeObject(DXN.make('org.dxos.type.magazine', '0.2.0')),
);

export type Magazine = Type.InstanceType<typeof Magazine>;

/** Checks if a value is a Magazine object. */
export const instanceOf = (value: unknown): value is Magazine => Obj.instanceOf(Magazine, value);

export type MakeProps = Omit<Obj.MakeProps<typeof Magazine>, 'feeds' | 'posts' | 'routine' | 'postState'> & {
  feeds?: Ref.Ref<Subscription.Subscription>[];
  posts?: Ref.Ref<Subscription.Post>[];
};

/**
 * Creates a Magazine with its per-Post state map as a hidden child (cascade-deleted with the
 * magazine). The curation Routine is created lazily by {@link ensureRoutine} on first curation, so
 * no Routine is persisted here.
 */
export const make = (props: MakeProps = {}): Magazine => {
  const postState = StateMap.make();
  const magazine = Obj.make(Magazine, {
    name: props.name,
    feeds: props.feeds ?? [],
    posts: props.posts ?? [],
    topic: props.topic,
    keep: props.keep,
    postState: Ref.make(postState),
  });
  // Cascade-delete the per-Post state with the magazine.
  Obj.setParent(postState, magazine);
  return magazine;
};

/** Composes Routine instructions from the default editorial methodology and the magazine's topic. */
export const composeInstructions = (topic?: string): string => {
  const trimmed = topic?.trim();
  return trimmed ? `${DEFAULT_INSTRUCTIONS}\n\n## Topic\n\n${trimmed}` : DEFAULT_INSTRUCTIONS;
};

/**
 * Resolves the Magazine's curation Routine, creating it on first use. The Routine is seeded with the
 * default editorial instructions (the {@link topic} woven in), references the supplied blueprints, is
 * parented to the magazine for cascade-delete, and is recorded on `magazine.routine`. Idempotent.
 */
export const ensureRoutine = (
  magazine: Magazine,
  blueprints: Ref.Ref<Blueprint.Blueprint>[] = [],
): Effect.Effect<Routine.Routine, never, Database.Service> =>
  Effect.gen(function* () {
    if (magazine.routine) {
      const existing = yield* Database.load(magazine.routine).pipe(Effect.option);
      if (Option.isSome(existing)) {
        return existing.value;
      }
    }

    const routine = yield* Database.add(
      Routine.make({
        name: magazine.name ? `${magazine.name} curation` : 'Magazine curation',
        instructions: composeInstructions(magazine.topic),
        blueprints,
      }),
    );
    // Cascade-delete the Routine (and its instructions Text) with the magazine.
    Obj.setParent(routine, magazine);
    if (routine.instructions.target) {
      Obj.setParent(routine.instructions.target, routine);
    }
    Obj.update(magazine, (magazine) => {
      magazine.routine = Ref.make(routine);
    });
    // TODO(burdon): Add the magazine to the Routine's context (`Routine.objects`) once that field
    //   lands, so the agent sees the magazine as bound context, not only the candidate JSON input.
    return routine;
  });

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
  topic: Schema.optional(
    Schema.String.annotations({
      title: 'Topic',
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
