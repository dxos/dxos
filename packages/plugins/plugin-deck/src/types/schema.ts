//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Label, LayoutOperation } from '@dxos/app-toolkit';
import { type DeepReadonly } from '@dxos/util';

import { meta } from '#meta';

export * as Settings from './Settings';

export const PLANK_COMPANION_TYPE = `${meta.id}.plank-companion`;
export const DECK_COMPANION_TYPE = `${meta.id}.deck-companion`;

export type Part = 'solo' | 'multi' | 'complementary';
export type ResolvedPart = Part | 'solo-primary' | 'solo-companion';

export const PlankSizing = Schema.Record({ key: Schema.String, value: Schema.Number });
export type PlankSizing = Schema.Schema.Type<typeof PlankSizing>;

export const DeckState = Schema.Struct({
  /** If false, the deck has not yet left solo mode and new planks should be soloed. */
  initialized: Schema.Boolean,
  /** Item IDs of planks currently displayed in multi-mode. */
  active: Schema.mutable(Schema.Array(Schema.String)),
  /** Item IDs of planks that have been closed; used for state persistence and reopening. */
  inactive: Schema.mutable(Schema.Array(Schema.String)),
  /** Item ID of the single plank displayed in solo or fullscreen mode. */
  solo: Schema.optional(Schema.String),
  /** Whether the solo plank is displayed in fullscreen mode (no heading or sidebars). */
  fullscreen: Schema.Boolean,
  /** Persisted plank widths in rem, keyed by item ID. */
  plankSizing: Schema.mutable(PlankSizing),
  /** Whether the companion pane is visible alongside the active plank(s). */
  companionOpen: Schema.Boolean,
  /** Which companion variant to display when the companion pane is open. */
  companionVariant: Schema.optional(Schema.String),
  /** Persisted companion frame widths in rem, keyed by frame ID. */
  companionFrameSizing: Schema.mutable(PlankSizing),
});
export type DeckState = Schema.Schema.Type<typeof DeckState>;

export const defaultDeck: DeckState = {
  initialized: false,
  active: [],
  inactive: [],
  solo: undefined,
  fullscreen: false,
  plankSizing: {},
  companionOpen: false,
  companionVariant: undefined,
  companionFrameSizing: {},
};

//
// Layout
//

const LayoutMode = Schema.Literal('multi', 'solo', 'solo--fullscreen');
export type LayoutMode = Schema.Schema.Type<typeof LayoutMode>;
export const isLayoutMode = (value: any): value is LayoutMode => Schema.is(LayoutMode)(value);
export const getMode = (deck: DeckState | DeepReadonly<DeckState>): LayoutMode => {
  if (deck.solo) {
    return deck.fullscreen ? 'solo--fullscreen' : 'solo';
  }

  return 'multi';
};

// Persisted plugin state (stored in KVS/localStorage).
export const StoredDeckState = Schema.Struct({
  sidebarState: Schema.Literal('closed', 'collapsed', 'expanded'),
  complementarySidebarState: Schema.Literal('closed', 'collapsed', 'expanded'),
  complementarySidebarPanel: Schema.optional(Schema.String),
  activeDeck: Schema.String,
  previousDeck: Schema.String,
  decks: Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.mutable(DeckState) })),
  previousMode: Schema.mutable(Schema.Record({ key: Schema.String, value: LayoutMode })),
}).pipe(Schema.mutable);
export type StoredDeckState = Schema.Schema.Type<typeof StoredDeckState>;

// Transient/ephemeral plugin state (not persisted).
export const EphemeralDeckState = Schema.Struct({
  dialogOpen: Schema.Boolean,
  dialogType: Schema.optional(Schema.Literal('default', 'alert')),
  dialogBlockAlign: Schema.optional(Schema.Literal('start', 'center', 'end')),
  dialogOverlayClasses: Schema.optional(Schema.String),
  dialogOverlayStyle: Schema.optional(Schema.Record({ key: Schema.String, value: Schema.Any })),
  /** Data to be passed to the dialog Surface. */
  dialogContent: Schema.optional(Schema.Any),
  popoverOpen: Schema.Boolean,
  popoverSide: Schema.optional(Schema.Literal('top', 'right', 'bottom', 'left')),
  popoverAnchor: Schema.optional(Schema.Any),
  popoverAnchorId: Schema.optional(Schema.String),
  popoverKind: Schema.optional(Schema.Literal('base', 'card')),
  popoverTitle: Schema.optional(Label.annotations({ description: 'The title of the popover.' })),
  /** Ref of the subject to be passed to the popover Surface. */
  popoverContentRef: Schema.optional(Schema.String),
  /** Data to be passed to the popover Surface. */
  popoverContent: Schema.optional(Schema.Any),
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
    Schema.Literal('companion').annotations({ description: 'Open the companion plank.' }),
    Schema.Literal('solo').annotations({ description: 'Solo the plank.' }),
    Schema.Literal('solo--fullscreen').annotations({ description: 'Fullscreen the plank.' }),
    Schema.Literal('increment-start').annotations({ description: 'Move the plank towards the start of the deck.' }),
    Schema.Literal('increment-end').annotations({ description: 'Move the plank towards the end of the deck.' }),
  );
  export type PartAdjustment = Schema.Schema.Type<typeof PartAdjustmentSchema>;
  export const Adjustment = Schema.mutable(Schema.Struct({ id: Schema.String, type: PartAdjustmentSchema }));
  export type Adjustment = Schema.Schema.Type<typeof Adjustment>;

  // An atomic transaction to apply to the deck, describing which element to move to which location.
  export class Adjust extends Schema.TaggedClass<Adjust>()(`${meta.id}.action.adjust`, {
    input: Adjustment,
    output: Schema.Void,
  }) {}

  export class UpdatePlankSize extends Schema.TaggedClass<UpdatePlankSize>()(`${meta.id}.action.update-plank-size`, {
    input: Schema.Struct({
      id: Schema.String,
      size: Schema.Number,
    }),
    output: Schema.Void,
  }) {}

  export class ChangeCompanion extends Schema.TaggedClass<ChangeCompanion>()(`${meta.id}.action.change-companion`, {
    input: Schema.Struct({
      companion: Schema.Union(Schema.String, Schema.Null),
    }),
    output: Schema.Void,
  }) {}
}
