//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { AppAnnotation } from '@dxos/app-toolkit';
import { Skill, Instructions } from '@dxos/compute';
import { DXN, Annotation, Obj, Ref, Type } from '@dxos/echo';
import { FormInlineAnnotation, FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type EntityId } from '@dxos/keys';
import { Routine } from '@dxos/plugin-routine';
import { StateMap } from '@dxos/schema';
import { trim } from '@dxos/util';

import * as Subscription from './Subscription';

export const SKILL_KEY = 'org.dxos.skill.magazine';

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
 * Curation is driven by a {@link Routine.Routine} created with the magazine ({@link make}): it
 * holds the editorial brief and references the Magazine skill (the tool/output contract), is
 * parented to the magazine (cascade-deletes with it), and appears in the nav tree as a
 * non-deletable child. {@link CurateMagazine} runs the Routine to select matching Posts.
 */
export const Magazine = Schema.Struct({
  /** User-facing title of the magazine. */
  name: Schema.String.pipe(Schema.optional),
  /** Feeds to pull content from. */
  feeds: Schema.Array(Ref.Ref(Subscription.Subscription)),
  /** Curated Post refs (insertion order; UI displays newest-last reversed). */
  posts: Schema.Array(Ref.Ref(Subscription.Post)).pipe(FormInputAnnotation.set(false)),
  /**
   * Curation Routine, created with the magazine ({@link make}). Parented to the magazine so it
   * cascade-deletes with it and appears in the nav tree as a non-deletable child. Rendered inline
   * by the properties form (Routine's own fields), allowing the routine to be reviewed inline.
   */
  routine: Ref.Ref(Routine.Routine).pipe(FormInlineAnnotation.set(true), Schema.optional),
  /**
   * Curation Instructions owned by the Routine ({@link make}). Kept as a direct ref on the magazine
   * so the strong-dep chain (magazine → instructions → text) ensures all objects are persisted when
   * the magazine is added to the database. Not shown in forms.
   */
  instructions: Ref.Ref(Instructions.Instructions).pipe(FormInputAnnotation.set(false), Schema.optional),
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
  AppAnnotation.SkillsAnnotation.set([SKILL_KEY]),
  Type.makeObject(DXN.make('org.dxos.type.magazine', '0.3.0')),
);

export type Magazine = Type.InstanceType<typeof Magazine>;

/** Checks if a value is a Magazine object. */
export const instanceOf = (value: unknown): value is Magazine => Obj.instanceOf(Magazine, value);

export type MakeProps = Omit<
  Obj.MakeProps<typeof Magazine>,
  'feeds' | 'posts' | 'routine' | 'instructions' | 'postState'
> & {
  feeds?: Ref.Ref<Subscription.Subscription>[];
  posts?: Ref.Ref<Subscription.Post>[];
  /** Editorial brief seeded into the curation Routine's instructions (composed with the default methodology). */
  instructions?: string;
};

/**
 * Creates a Magazine plus its curation Routine, Instructions, and per-Post state map — all
 * cascade-deleted with the magazine. The Routine is parented to the magazine (visible in the nav
 * tree as a non-deletable child); the Instructions is parented to the Routine and references the
 * Magazine skill by its registry DXN. Both are also held as direct refs on the magazine so the
 * strong-dep chain persists the whole object graph when the magazine is added to the database.
 */
export const make = (props: MakeProps = {}): Magazine => {
  const curationName = props.name ? `${props.name} curation` : 'Magazine curation';
  const postState = StateMap.make();
  const magazine = Obj.make(Magazine, {
    name: props.name,
    feeds: props.feeds ?? [],
    posts: props.posts ?? [],
    keep: props.keep,
    postState: Ref.make(postState),
  });

  const instructions = Instructions.make({
    name: curationName,
    text: composeInstructions(props.instructions),
    skills: [Ref.fromURI(Skill.registryURI(SKILL_KEY))],
    // Bind the magazine as session context so the agent sees it, not only the candidate JSON input.
    objects: [Ref.make(magazine)],
  });
  const routine = Routine.make({ name: curationName, triggers: [] });

  Obj.update(magazine, (magazine) => {
    magazine.routine = Ref.make(routine);
    magazine.instructions = Ref.make(instructions);
  });

  // Parent chain: magazine → routine → instructions → text; postState → magazine.
  // Cascade-delete propagates down the parent chain when the magazine is deleted.
  Obj.setParent(routine, magazine);
  Obj.setParent(instructions, routine);
  if (instructions.text.target) {
    Obj.setParent(instructions.text.target, instructions);
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
