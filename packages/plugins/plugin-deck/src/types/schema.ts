//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { AppNode, LayoutOperation, Translations } from '@dxos/app-toolkit';

import { meta } from '#meta';

export const PLANK_COMPANION_TYPE = AppNode.PLANK_COMPANION_TYPE;
export const DECK_COMPANION_TYPE = AppNode.DECK_COMPANION_TYPE;

export type Part = 'main' | 'complementary';
export type ResolvedPart = Part;

export const PlankSizing = Schema.Record({ key: Schema.String, value: Schema.Number });
export type PlankSizing = Schema.Schema.Type<typeof PlankSizing>;

export const DeckState = Schema.Struct({
  /** Item IDs of planks currently active. A singleton list renders fullbleed; 2+ render as a sliding deck. */
  active: Schema.mutable(Schema.Array(Schema.String)),
  /** Item IDs of planks that have been closed; used for state persistence and reopening. */
  inactive: Schema.mutable(Schema.Array(Schema.String)),
  /**
   * Absolute widths in rem, keyed by item id — a plank keeps its width wherever it sits. The companion's
   * own width is held here too, under a key that is not a valid item id (see `DeckViewport`).
   */
  plankSizing: Schema.mutable(PlankSizing),
  /**
   * Planks showing their companion, by id. Per plank rather than per deck so moving between planks
   * restores what each was left in — a plank you closed the companion on stays closed when you come
   * back to it, while the one you left it open on reopens it.
   */
  companionPlanks: Schema.mutable(Schema.Array(Schema.String)),
  /**
   * Named planks, as name → the plank id currently occupying that name. A name makes a plank behave
   * like a browser tab: opening under a name that is already taken replaces its occupant in place.
   * Entries are pruned as their plank closes.
   */
  plankNames: Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.String })),
});
export type DeckState = Schema.Schema.Type<typeof DeckState>;

/**
 * Deck key for the "no workspace resolved yet" sentinel — the initial `activeDeck` of a fresh profile,
 * held until the plugin that owns spaces switches to a real workspace. Not a graph node id, so it is
 * never serialized into the URL (see the deck's url-handler).
 */
export const DEFAULT_DECK_ID = 'default';

export const defaultDeck: DeckState = {
  active: [],
  inactive: [],
  plankSizing: {},
  companionPlanks: [],
  plankNames: {},
};

//
// Layout
//

const LayoutMode = Schema.Literal('multi', 'solo', 'solo--fullscreen');
export type LayoutMode = Schema.Schema.Type<typeof LayoutMode>;
export const isLayoutMode = (value: any): value is LayoutMode => Schema.is(LayoutMode)(value);

/**
 * The `Layout` capability's mode: a fullscreen plank renders alone and headless, so it reports as
 * `solo--fullscreen`; otherwise the mode follows the active plank count (companions excluded).
 */
export const getMode = (deck: { active: readonly string[] }, fullscreen: boolean): LayoutMode =>
  fullscreen ? 'solo--fullscreen' : deck.active.length > 1 ? 'multi' : 'solo';

// Persisted plugin state (stored in KVS/localStorage).
export const StoredDeckState = Schema.Struct({
  sidebarState: Schema.Literal('closed', 'collapsed', 'expanded'),
  complementarySidebarState: Schema.Literal('closed', 'collapsed', 'expanded'),
  complementarySidebarPanel: Schema.optional(Schema.String),
  /** Expanded width of the complementary sidebar in rem; absent falls back to the theme default. */
  complementarySidebarSize: Schema.optional(Schema.Number),
  activeDeck: Schema.String,
  previousDeck: Schema.String,
  decks: Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.mutable(DeckState) })),
}).pipe(Schema.mutable);
export type StoredDeckState = Schema.Schema.Type<typeof StoredDeckState>;

// Transient/ephemeral plugin state (not persisted).
export const EphemeralDeckState = Schema.Struct({
  /** Item ID of the plank currently displayed fullscreen (headless); transient, never in the URL. */
  fullscreen: Schema.optional(Schema.String),
  /**
   * Item ID of the plank currently expanded to fill the deck, leaving only the other planks' spines
   * beside it. Transient, and separate from `plankSizing` so collapsing restores the plank's own width.
   */
  expanded: Schema.optional(Schema.String),
  /** Whether the deck is showing every plank at once as shrunk-to-fit tiles. Transient. */
  expose: Schema.optional(Schema.Boolean),
  dialogOpen: Schema.Boolean,
  dialogType: Schema.optional(Schema.Literal('default', 'alert')),
  dialogBlockAlign: Schema.optional(Schema.Literal('start', 'center', 'end')),
  dialogOverlayClasses: Schema.optional(Schema.String),
  dialogOverlayStyle: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
  /** Data to be passed to the dialog Surface. */
  dialogContent: Schema.NullOr(Schema.Struct({ component: Schema.String, props: Schema.optional(Schema.Any) })),
  popoverOpen: Schema.Boolean,
  popoverSide: Schema.optional(Schema.Literal('top', 'right', 'bottom', 'left')),
  popoverAnchor: Schema.optional(Schema.Any),
  popoverAnchorId: Schema.optional(Schema.String),
  popoverKind: Schema.optional(Schema.Literal('base', 'card', 'rename')),
  popoverTitle: Schema.optional(Translations.Label.annotations({ description: 'The title of the popover.' })),
  /** Ref of the subject to be passed to the popover Surface. */
  popoverContentRef: Schema.optional(Schema.String),
  /** Data to be passed to the popover Surface. */
  popoverContent: Schema.NullOr(
    Schema.Union(
      Schema.Struct({ component: Schema.String, props: Schema.optional(Schema.Any) }),
      Schema.Struct({ subject: Schema.Any }),
    ),
  ),
  toasts: Schema.mutable(Schema.Array(LayoutOperation.Toast)),
  currentUndoId: Schema.optional(Schema.String),
  /** The identifier of a component to scroll into view when it is mounted. */
  scrollIntoView: Schema.optional(Schema.String),
}).pipe(Schema.mutable);
export type EphemeralDeckState = Schema.Schema.Type<typeof EphemeralDeckState>;

// Combined state type (for convenience in components that need both).
export type DeckPluginState = StoredDeckState & EphemeralDeckState;

export namespace DeckAction {
  const PartAdjustmentSchema = Schema.Union(
    Schema.Literal('close').annotations({ description: 'Close the plank.' }),
    Schema.Literal('companion').annotations({ description: 'Open the companion plank side-by-side.' }),
    Schema.Literal('fullscreen').annotations({ description: 'Toggle fullscreen display of the plank.' }),
    Schema.Literal('expand').annotations({
      description: "Toggle the plank filling the deck, leaving only the other planks' spines beside it.",
    }),
    Schema.Literal('increment-start').annotations({ description: 'Move the plank towards the start of the deck.' }),
    Schema.Literal('increment-end').annotations({ description: 'Move the plank towards the end of the deck.' }),
  );
  export type PartAdjustment = Schema.Schema.Type<typeof PartAdjustmentSchema>;
  export const Adjustment = Schema.mutable(Schema.Struct({ id: Schema.String, type: PartAdjustmentSchema }));
  export type Adjustment = Schema.Schema.Type<typeof Adjustment>;

  // An atomic transaction to apply to the deck, describing which element to move to which location.
  export class Adjust extends Schema.TaggedClass<Adjust>()(`${meta.profile.key}.action.adjust`, {
    input: Adjustment,
    output: Schema.Void,
  }) {}

  export class UpdatePlankSize extends Schema.TaggedClass<UpdatePlankSize>()(
    `${meta.profile.key}.action.update-plank-size`,
    {
      input: Schema.Struct({
        id: Schema.String,
        size: Schema.Number,
      }),
      output: Schema.Void,
    },
  ) {}
}
