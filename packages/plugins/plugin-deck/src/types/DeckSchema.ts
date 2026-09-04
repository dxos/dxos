//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Translations from '@dxos/app-toolkit/Translations';

import { meta } from '#meta';

export const PLANK_COMPANION_TYPE = AppNode.PLANK_COMPANION_TYPE;
export const DECK_COMPANION_TYPE = AppNode.DECK_COMPANION_TYPE;

export type Part = 'main' | 'complementary';
export type ResolvedPart = Part;

export const PlankSizing = Schema.Record(Schema.String, Schema.mutableKey(Schema.Number));
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
  plankSizing: Schema.mutableKey(PlankSizing),
  /**
   * Planks showing their companion, by id. Per plank while the deck slides, so moving between planks
   * restores what each was left in — a plank you closed the companion on stays closed when you come
   * back to it, while the one you left it open on reopens it. Under `flatten` only one plank is laid
   * out at a time and the flag is read deck-wide instead (`isCompanionOpen`), so the pane stays in the
   * state you left it in as you move between articles.
   */
  companionPlanks: Schema.mutable(Schema.Array(Schema.String)),
  /**
   * Named planks, as name → the plank id currently occupying that name. A name makes a plank behave
   * like a browser tab: opening under a name that is already taken replaces its occupant in place.
   * Entries are pruned as their plank closes.
   */
  plankNames: Schema.mutableKey(Schema.Record(Schema.String, Schema.mutableKey(Schema.String))),
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

const LayoutMode = Schema.Literals(['multi', 'solo', 'solo--fullscreen']);
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
  sidebarState: Schema.Literals(['closed', 'collapsed', 'expanded']),
  /**
   * Openness of the deck-level complementary sidebar on desktop, and of the whole companion drawer on
   * mobile — read it through {@link getCompanionSelection} rather than directly, which is what keeps
   * the two meanings apart.
   */
  complementarySidebarState: Schema.Literals(['closed', 'collapsed', 'expanded']),
  /**
   * Which panel that sidebar shows: a deck-level companion variant on desktop, but the selected *plank*
   * companion on mobile, where the drawer has no planks to hang `companionPlanks` off — see
   * {@link getCompanionSelection} for the platform-correct read.
   */
  complementarySidebarPanel: Schema.optional(Schema.String),
  activeDeck: Schema.String,
  previousDeck: Schema.String,
  decks: Schema.mutableKey(
    Schema.Record(Schema.String, Schema.mutableKey(DeckState.mapFields(Struct.map(Schema.mutableKey)))),
  ),
}).mapFields(Struct.map(Schema.mutableKey));
export type StoredDeckState = Schema.Schema.Type<typeof StoredDeckState>;

/** Which root layout renders the deck's state; the two hosts express companion visibility differently. */
export type Platform = 'mobile' | 'desktop';

/** Which plank companion the host currently has on screen. */
export type CompanionSelection = {
  /** Whether the companion pane is on screen at all. */
  open: boolean;
  /** The chosen tab; absent means the pane falls back to the plank's first companion. */
  variant?: string;
};

/**
 * The plank companion the host is showing, in one shape for consumers outside the layout (e.g. the
 * assistant provisioning a chat for the plank). The deck marks the pane open per plank
 * (`companionPlanks`) and keeps the chosen tab in global view state, while the mobile drawer has no
 * planks and holds both in `complementarySidebar*` — that split is a layout detail, not one every
 * consumer should have to re-derive.
 *
 * Both sets of fields can be *written* on either platform — a URL restore invokes `UpdateCompanion`
 * without knowing the host — so it is this read, not the writes, that makes the answer correct: each
 * branch consults only the fields its host actually renders from and ignores the other's.
 */
export const getCompanionSelection = (
  platform: Platform,
  state: StoredDeckState,
  viewStateVariant: string | undefined,
): CompanionSelection => {
  if (platform === 'mobile') {
    const open = state.complementarySidebarState !== 'closed' && state.complementarySidebarPanel !== undefined;
    return { open, variant: open ? state.complementarySidebarPanel : undefined };
  }

  const open = (state.decks[state.activeDeck]?.companionPlanks.length ?? 0) > 0;
  return { open, variant: open ? viewStateVariant : undefined };
};

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
  /**
   * Planks a URL restore could not resolve, by item ID. Separates "gave up" from "still loading",
   * which an absent node cannot express on its own. Transient — resolvability is not a deck fact.
   */
  unresolved: Schema.optional(Schema.Array(Schema.String)),
  dialogOpen: Schema.Boolean,
  dialogType: Schema.optional(Schema.Literals(['default', 'alert'])),
  dialogBlockAlign: Schema.optional(Schema.Literals(['start', 'center', 'end'])),
  dialogOverlayClasses: Schema.optional(Schema.String),
  dialogOverlayStyle: Schema.optional(Schema.Record(Schema.String, Schema.Any)),
  /** Data to be passed to the dialog Surface. */
  dialogContent: Schema.NullOr(Schema.Struct({ component: Schema.String, props: Schema.optional(Schema.Any) })),
  popoverOpen: Schema.Boolean,
  popoverSide: Schema.optional(Schema.Literals(['top', 'right', 'bottom', 'left'])),
  popoverAnchor: Schema.optional(Schema.Any),
  popoverAnchorId: Schema.optional(Schema.String),
  popoverKind: Schema.optional(Schema.Literals(['base', 'card', 'rename'])),
  popoverTitle: Schema.optional(Translations.Label.annotate({ description: 'The title of the popover.' })),
  /** Ref of the subject to be passed to the popover Surface. */
  popoverContentRef: Schema.optional(Schema.String),
  /** Data to be passed to the popover Surface. */
  popoverContent: Schema.NullOr(
    Schema.Union([
      Schema.Struct({ component: Schema.String, props: Schema.optional(Schema.Any) }),
      Schema.Struct({ subject: Schema.Any }),
    ]),
  ),
  toasts: Schema.mutable(Schema.Array(LayoutOperation.Toast)),
  currentUndoId: Schema.optional(Schema.String),
  /** The identifier of a component to scroll into view when it is mounted. */
  scrollIntoView: Schema.optional(Schema.String),
}).mapFields(Struct.map(Schema.mutableKey));
export type EphemeralDeckState = Schema.Schema.Type<typeof EphemeralDeckState>;

// Combined state type (for convenience in components that need both).
export type DeckPluginState = StoredDeckState & EphemeralDeckState;

export namespace DeckAction {
  const PartAdjustmentSchema = Schema.Union([
    Schema.Literal('close').annotate({ description: 'Close the plank.' }),
    Schema.Literal('companion').annotate({ description: 'Open the companion plank side-by-side.' }),
    Schema.Literal('fullscreen').annotate({ description: 'Toggle fullscreen display of the plank.' }),
    Schema.Literal('expand').annotate({
      description: "Toggle the plank filling the deck, leaving only the other planks' spines beside it.",
    }),
    Schema.Literal('increment-start').annotate({ description: 'Move the plank towards the start of the deck.' }),
    Schema.Literal('increment-end').annotate({ description: 'Move the plank towards the end of the deck.' }),
  ]);
  export type PartAdjustment = Schema.Schema.Type<typeof PartAdjustmentSchema>;
  export const Adjustment = Schema.Struct({ id: Schema.String, type: PartAdjustmentSchema }).mapFields(
    Struct.map(Schema.mutableKey),
  );
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
