//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Skill, Routine } from '@dxos/compute';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInlineAnnotation, FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type EntityId } from '@dxos/keys';
import { StateMap } from '@dxos/schema';
import { trim } from '@dxos/util';

import * as Subscription from './Subscription';

export const BLUEPRINT_KEY = 'org.dxos.skill.magazine';

/**
 * Default editorial methodology seeded into a Magazine's curation Routine. Describes WHAT to curate
 * (selection, dedup, snippet, hero image). The HOW (candidate input shape, tool usage, output
 * contract) lives in the Magazine skill, not here.
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
 * Curation is driven by a {@link Routine.Routine} created with the magazine ({@link make}): its
 * instructions hold the editorial brief and it references the Magazine skill (the tool/output
 * contract). {@link CurateMagazine} runs the Routine to select matching Posts.
 */
export const Magazine = Schema.Struct({
  /** User-facing title of the magazine. */
  name: Schema.String.pipe(Schema.optional),
  /** Feeds to pull content from. */
  feeds: Schema.Array(Ref.Ref(Subscription.Subscription)),
  /** Curated Post refs (insertion order; UI displays newest-last reversed). */
  posts: Schema.Array(Ref.Ref(Subscription.Post)).pipe(FormInputAnnotation.set(false)),
  /**
   * Curation Routine, created with the magazine ({@link make}). Holds the editorial brief (its
   * instructions) and references the Magazine skill. Rendered inline by the properties form (the
   * Routine's own fields), so the brief is edited there without a custom surface.
   * Optional for backward compatibility; {@link CurateMagazine} and the toolbar require it.
   */
  routine: Ref.Ref(Routine.Routine).pipe(FormInlineAnnotation.set(true), Schema.optional),
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
  AppAnnotation.SkillsAnnotation.set([BLUEPRINT_KEY]),
  Type.makeObject(DXN.make('org.dxos.type.magazine', '0.2.0')),
);

export type Magazine = Type.InstanceType<typeof Magazine>;

/** Checks if a value is a Magazine object. */
export const instanceOf = (value: unknown): value is Magazine => Obj.instanceOf(Magazine, value);

export type MakeProps = Omit<Obj.MakeProps<typeof Magazine>, 'feeds' | 'posts' | 'routine' | 'postState'> & {
  feeds?: Ref.Ref<Subscription.Subscription>[];
  posts?: Ref.Ref<Subscription.Post>[];
  /** Editorial brief seeded into the curation Routine's instructions (composed with the default methodology). */
  instructions?: string;
};

/**
 * Creates a Magazine plus its curation Routine and per-Post state map as hidden children (all
 * cascade-deleted with the magazine). The Routine holds the editorial brief (its instructions,
 * seeded from {@link composeInstructions}) and references the Magazine skill by its registry DXN;
 * {@link CurateMagazine} runs it and the agent resolves the skill at run time.
 */
export const make = (props: MakeProps = {}): Magazine => {
  const postState = StateMap.make();
  const magazine = Obj.make(Magazine, {
    name: props.name,
    feeds: props.feeds ?? [],
    posts: props.posts ?? [],
    keep: props.keep,
    postState: Ref.make(postState),
  });

  const routine = Routine.make({
    name: props.name ? `${props.name} curation` : 'Magazine curation',
    instructions: composeInstructions(props.instructions),
    skills: [Ref.fromURI(Skill.registryURI(BLUEPRINT_KEY))],
    // Bind the magazine as session context so the agent sees it, not only the candidate JSON input.
    objects: [Ref.make(magazine)],
  });
  Obj.update(magazine, (magazine) => {
    magazine.routine = Ref.make(routine);
  });

  // Cascade-delete the Routine (and its instructions Text) and the per-Post state with the magazine.
  Obj.setParent(routine, magazine);
  if (routine.instructions.target) {
    Obj.setParent(routine.instructions.target, routine);
  }
  Obj.setParent(postState, magazine);
  return magazine;
};

/** Composes Routine instructions from the default editorial methodology and an optional topic focus. */
export const composeInstructions = (topic?: string): string => {
  const trimmed = topic?.trim();
  return trimmed ? `${DEFAULT_INSTRUCTIONS}\n\n## Topic\n\n${trimmed}` : DEFAULT_INSTRUCTIONS;
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
