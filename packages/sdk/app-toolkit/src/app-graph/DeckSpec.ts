//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

/**
 * How a plank opened at this level is sized when it first appears. An *initial* width only: the deck
 * consults it when a plank has no stored width, so the first drag pins the plank and the level's
 * intent never fights the user afterwards.
 *
 * `'fill'` shares the span the two spine piles leave with the other open `'fill'` levels.
 */
export const LevelSize = Schema.Union(Schema.Number, Schema.Literal('fill'));
export type LevelSize = Schema.Schema.Type<typeof LevelSize>;

/**
 * One rung of a deck's chain, e.g. `mailbox` → `message` → `attachment`.
 *
 * The key becomes the plank's name (`<rootId>/<key>`), so opening at a level reuses that level's plank
 * through the mechanism named planks already provide, and opening at a level closes every level below
 * it — reading a second message drops the first one's attachment.
 */
export const DeckLevel = Schema.Struct({
  key: Schema.String.annotations({ description: 'Level key; forms the plank name as `<rootId>/<key>`.' }),
  size: Schema.optional(LevelSize),
});
export type DeckLevel = Schema.Schema.Type<typeof DeckLevel>;

/** What a deck opens when it is adopted. `'children'` opens the root node's graph children. */
export const DeckInitial = Schema.Literal('children', 'none');
export type DeckInitial = Schema.Schema.Type<typeof DeckInitial>;

/**
 * How a type wants the deck to behave when one of its objects is the deck's root.
 *
 * Declared as a schema annotation ({@link AppAnnotation.DeckAnnotation}) rather than per node, because
 * the shape belongs to the type: every Collection opens its children, every Mailbox has the same three
 * rungs. The graph builder surfaces it onto the node so the deck reads it like any other node property.
 */
export const DeckSpec = Schema.Struct({
  levels: Schema.optional(Schema.Array(DeckLevel)),
  initial: Schema.optional(DeckInitial),
});
export type DeckSpec = Schema.Schema.Type<typeof DeckSpec>;

/** Node property under which a resolved {@link DeckSpec} is surfaced. */
export const DECK_SPEC_PROPERTY = 'deck';

const isDeckSpec = Schema.is(DeckSpec);

/**
 * Reads the deck spec a node carries, or `undefined` when it declares none. Validated rather than cast:
 * `Node.properties` is an untyped bag that any plugin can write, so a malformed spec must read as
 * "no spec" instead of reaching the deck's geometry.
 */
export const fromNode = (node: { properties: Readonly<Record<string, any>> } | undefined): DeckSpec | undefined => {
  const value = node?.properties?.[DECK_SPEC_PROPERTY];
  return value !== undefined && isDeckSpec(value) ? value : undefined;
};

/** The level a plank belongs to, given the deck root it was opened under. Inverse of {@link plankName}. */
export const levelOf = (
  spec: DeckSpec | undefined,
  rootId: string,
  plankName: string | undefined,
): string | undefined => {
  if (!spec?.levels || !plankName?.startsWith(`${rootId}/`)) {
    return undefined;
  }
  const key = plankName.slice(rootId.length + 1);
  return spec.levels.some((level) => level.key === key) ? key : undefined;
};

/** The plank name a level occupies within a deck root. */
export const plankName = (rootId: string, levelKey: string): string => `${rootId}/${levelKey}`;

/** Levels strictly below `levelKey`, i.e. the ones an open at that level closes. */
export const levelsBelow = (spec: DeckSpec | undefined, levelKey: string): DeckLevel[] => {
  const index = spec?.levels?.findIndex((level) => level.key === levelKey) ?? -1;
  return index === -1 ? [] : [...(spec?.levels ?? [])].slice(index + 1);
};
