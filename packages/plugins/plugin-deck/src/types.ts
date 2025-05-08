//
// Copyright 2023 DXOS.org
//

import { LayoutAction } from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { type DeepReadonly } from '@dxos/util';

import { DECK_PLUGIN } from './meta';

export { ATTENDABLE_PATH_SEPARATOR } from '@dxos/react-ui-attention';

export const PLANK_COMPANION_TYPE = 'dxos.org/plugin/deck/plank-companion';
export const DECK_COMPANION_TYPE = 'dxos.org/plugin/deck/deck-companion';

// TODO(Zan): In the future we should consider adding new planks adjacent to the attended plank.
export const NewPlankPositions = ['start', 'end'] as const;
export type NewPlankPositioning = (typeof NewPlankPositions)[number];

export const OverscrollOptions = ['none', 'centering'] as const;
export type Overscroll = (typeof OverscrollOptions)[number];

export type Part = 'solo' | 'deck' | 'complementary';
export type ResolvedPart = Part | 'solo-primary' | 'solo-companion';

export const DeckSettingsSchema = S.Struct({
  showHints: S.optional(S.Boolean),
  enableDeck: S.optional(S.Boolean),
  enableNativeRedirect: S.optional(S.Boolean),
  enableStatusbar: S.optional(S.Boolean),
  newPlankPositioning: S.optional(S.Literal(...NewPlankPositions)),
  overscroll: S.optional(S.Literal(...OverscrollOptions)),
}).pipe(S.mutable);
export type DeckSettingsProps = S.Schema.Type<typeof DeckSettingsSchema>;

export const PlankSizing = S.Record({ key: S.String, value: S.Number });
export type PlankSizing = S.Schema.Type<typeof PlankSizing>;

// State of an individual deck.
export const DeckState = S.Struct({
  /** If false, the deck has not yet left solo mode and new planks should be soloed. */
  initialized: S.Boolean,
  active: S.mutable(S.Array(S.String)),
  // TODO(wittjosiah): Piping into both mutable and optional caused invalid typescript output.
  activeCompanions: S.optional(S.mutable(S.Record({ key: S.String, value: S.String }))),
  inactive: S.mutable(S.Array(S.String)),
  solo: S.optional(S.String),
  fullscreen: S.Boolean,
  plankSizing: S.mutable(PlankSizing),
  companionFrameSizing: S.mutable(PlankSizing),
});
export type DeckState = S.Schema.Type<typeof DeckState>;

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

const LayoutMode = S.Literal('deck', 'solo', 'solo--fullscreen');
export type LayoutMode = S.Schema.Type<typeof LayoutMode>;
export const isLayoutMode = (value: any): value is LayoutMode => S.is(LayoutMode)(value);

export const getMode = (deck: DeckState | DeepReadonly<DeckState>): LayoutMode => {
  if (deck.solo) {
    return deck.fullscreen ? 'solo--fullscreen' : 'solo';
  }

  return 'deck';
};

// State of the deck plugin.
export const DeckPluginState = S.Struct({
  sidebarState: S.Literal('closed', 'collapsed', 'expanded'),
  complementarySidebarState: S.Literal('closed', 'collapsed', 'expanded'),
  complementarySidebarPanel: S.optional(S.String),

  dialogOpen: S.Boolean,
  dialogBlockAlign: S.optional(S.Literal('start', 'center', 'end')),
  dialogType: S.optional(S.Literal('default', 'alert')),
  /** Data to be passed to the dialog Surface. */
  dialogContent: S.optional(S.Any),

  popoverOpen: S.Boolean,
  popoverSide: S.optional(S.Literal('top', 'right', 'bottom', 'left')),
  popoverAnchor: S.optional(S.Any),
  popoverAnchorId: S.optional(S.String),
  /** Data to be passed to the popover Surface. */
  popoverContent: S.optional(S.Any),

  toasts: S.mutable(S.Array(LayoutAction.Toast)),
  currentUndoId: S.optional(S.String),

  activeDeck: S.String,
  previousDeck: S.String,
  decks: S.mutable(S.Record({ key: S.String, value: S.mutable(DeckState) })),
  previousMode: S.mutable(S.Record({ key: S.String, value: LayoutMode })),
  deck: S.mutable(DeckState),

  /** The identifier of a component to scroll into view when it is mounted. */
  scrollIntoView: S.optional(S.String),
}).pipe(S.mutable);

export type DeckPluginState = S.Schema.Type<typeof DeckPluginState>;

export const DECK_ACTION = `${DECK_PLUGIN}/action`;

export namespace DeckAction {
  const PartAdjustmentSchema = S.Union(
    S.Literal('close').annotations({ description: 'Close the plank.' }),
    S.Literal('companion').annotations({ description: 'Open the companion plank.' }),
    S.Literal('solo').annotations({ description: 'Solo the plank.' }),
    S.Literal('solo--fullscreen').annotations({ description: 'Fullscreen the plank.' }),
    S.Literal('increment-start').annotations({ description: 'Move the plank towards the start of the deck.' }),
    S.Literal('increment-end').annotations({ description: 'Move the plank towards the end of the deck.' }),
  );
  export type PartAdjustment = S.Schema.Type<typeof PartAdjustmentSchema>;
  export const Adjustment = S.mutable(S.Struct({ id: S.String, type: PartAdjustmentSchema }));
  export type Adjustment = S.Schema.Type<typeof Adjustment>;

  // An atomic transaction to apply to the deck, describing which element to move to which location.
  export class Adjust extends S.TaggedClass<Adjust>()(`${DECK_ACTION}/adjust`, {
    input: Adjustment,
    output: S.Void,
  }) {}

  export class UpdatePlankSize extends S.TaggedClass<UpdatePlankSize>()(`${DECK_ACTION}/update-plank-size`, {
    input: S.Struct({
      id: S.String,
      size: S.Number,
    }),
    output: S.Void,
  }) {}

  export class ChangeCompanion extends S.TaggedClass<ChangeCompanion>()(`${DECK_ACTION}/change-companion`, {
    input: S.Struct({
      primary: S.String,
      companion: S.Union(S.String, S.Null),
    }),
    output: S.Void,
  }) {}
}
