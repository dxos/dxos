//
// Copyright 2023 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Common } from '@dxos/app-framework';
import { type DeepReadonly } from '@dxos/util';

import { meta } from '../meta';

export { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';

export const PLANK_COMPANION_TYPE = `${meta.id}/plank-companion`;
export const DECK_COMPANION_TYPE = `${meta.id}/deck-companion`;

// TODO(Zan): In the future we should consider adding new planks adjacent to the attended plank.
export const NewPlankPositions = ['start', 'end'] as const;
export type NewPlankPositioning = (typeof NewPlankPositions)[number];

export const OverscrollOptions = ['none', 'centering'] as const;
export type Overscroll = (typeof OverscrollOptions)[number];

export type Part = 'solo' | 'deck' | 'complementary';
export type ResolvedPart = Part | 'solo-primary' | 'solo-companion';

export const DeckSettingsSchema = Schema.Struct({
  showHints: Schema.optional(Schema.Boolean),
  enableDeck: Schema.optional(Schema.Boolean),
  enableStatusbar: Schema.optional(Schema.Boolean),
  enableNativeRedirect: Schema.optional(Schema.Boolean),
  newPlankPositioning: Schema.optional(Schema.Literal(...NewPlankPositions)),
  overscroll: Schema.optional(Schema.Literal(...OverscrollOptions)),
  // TODO(burdon): Rename layoutMode? (e.g., bento | encapsulated?)
  encapsulatedPlanks: Schema.optional(Schema.Boolean),
}).pipe(Schema.mutable);
export type DeckSettingsProps = Schema.Schema.Type<typeof DeckSettingsSchema>;

export const PlankSizing = Schema.Record({ key: Schema.String, value: Schema.Number });
export type PlankSizing = Schema.Schema.Type<typeof PlankSizing>;

// State of an individual deck.
export const DeckState = Schema.Struct({
  /** If false, the deck has not yet left solo mode and new planks should be soloed. */
  initialized: Schema.Boolean,
  active: Schema.mutable(Schema.Array(Schema.String)),
  // TODO(wittjosiah): Piping into both mutable and optional caused invalid typescript output.
  activeCompanions: Schema.optional(Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.String }))),
  inactive: Schema.mutable(Schema.Array(Schema.String)),
  solo: Schema.optional(Schema.String),
  fullscreen: Schema.Boolean,
  plankSizing: Schema.mutable(PlankSizing),
  companionFrameSizing: Schema.mutable(PlankSizing),
});
export type DeckState = Schema.Schema.Type<typeof DeckState>;

export const defaultDeck: DeckState = {
  initialized: false,
  active: [],
  activeCompanions: {},
  inactive: [],
  solo: undefined,
  fullscreen: false,
  plankSizing: {},
  companionFrameSizing: {},
};

const LayoutMode = Schema.Literal('deck', 'solo', 'solo--fullscreen');
export type LayoutMode = Schema.Schema.Type<typeof LayoutMode>;
export const isLayoutMode = (value: any): value is LayoutMode => Schema.is(LayoutMode)(value);

export const getMode = (deck: DeckState | DeepReadonly<DeckState>): LayoutMode => {
  if (deck.solo) {
    return deck.fullscreen ? 'solo--fullscreen' : 'solo';
  }

  return 'deck';
};

// State of the deck plugin.
export const DeckPluginState = Schema.Struct({
  sidebarState: Schema.Literal('closed', 'collapsed', 'expanded'),
  complementarySidebarState: Schema.Literal('closed', 'collapsed', 'expanded'),
  complementarySidebarPanel: Schema.optional(Schema.String),

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
  /** Data to be passed to the popover Surface. */
  popoverContent: Schema.optional(Schema.Any),

  toasts: Schema.mutable(Schema.Array(Common.LayoutAction.Toast)),
  currentUndoId: Schema.optional(Schema.String),

  activeDeck: Schema.String,
  previousDeck: Schema.String,
  decks: Schema.mutable(Schema.Record({ key: Schema.String, value: Schema.mutable(DeckState) })),
  previousMode: Schema.mutable(Schema.Record({ key: Schema.String, value: LayoutMode })),
  deck: Schema.mutable(DeckState),

  /** The identifier of a component to scroll into view when it is mounted. */
  scrollIntoView: Schema.optional(Schema.String),
}).pipe(Schema.mutable);

export type DeckPluginState = Schema.Schema.Type<typeof DeckPluginState>;

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
  export class Adjust extends Schema.TaggedClass<Adjust>()(`${meta.id}/action/adjust`, {
    input: Adjustment,
    output: Schema.Void,
  }) {}

  export class UpdatePlankSize extends Schema.TaggedClass<UpdatePlankSize>()(`${meta.id}/action/update-plank-size`, {
    input: Schema.Struct({
      id: Schema.String,
      size: Schema.Number,
    }),
    output: Schema.Void,
  }) {}

  export class ChangeCompanion extends Schema.TaggedClass<ChangeCompanion>()(`${meta.id}/action/change-companion`, {
    input: Schema.Struct({
      primary: Schema.String,
      companion: Schema.Union(Schema.String, Schema.Null),
    }),
    output: Schema.Void,
  }) {}
}
