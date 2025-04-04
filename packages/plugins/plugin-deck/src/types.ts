//
// Copyright 2023 DXOS.org
//

import { LayoutAction } from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { type Node } from '@dxos/plugin-graph';
import { type Label } from '@dxos/react-ui';
import { type Position } from '@dxos/util';

import { DECK_PLUGIN } from './meta';

// TODO(Zan): In the future we should consider adding new planks adjacent to the attended plank.
export const NewPlankPositions = ['start', 'end'] as const;
export type NewPlankPositioning = (typeof NewPlankPositions)[number];

export const OverscrollOptions = ['none', 'centering'] as const;
export type Overscroll = (typeof OverscrollOptions)[number];

export type Part = 'solo' | 'deck' | 'complementary';
export type ResolvedPart = Part | 'solo-primary' | 'solo-companion';

export type Panel = {
  id: string;
  label: Label;
  icon: string;
  position?: Position;
  /**
   * If true, the panel will now be wrapped in a scroll area.
   */
  fixed?: boolean;
  filter?: (node: Node) => boolean;
};

export const DeckSettingsSchema = S.mutable(
  S.Struct({
    showHints: S.Boolean,
    enableNativeRedirect: S.Boolean,
    enableStatusbar: S.Boolean,
    newPlankPositioning: S.Literal(...NewPlankPositions),
    overscroll: S.Literal(...OverscrollOptions),
  }),
);

export type DeckSettingsProps = S.Schema.Type<typeof DeckSettingsSchema>;

const LayoutMode = S.Union(S.Literal('deck'), S.Literal('solo'), S.Literal('fullscreen'));
export const isLayoutMode = (value: any): value is LayoutMode => S.is(LayoutMode)(value);
export type LayoutMode = S.Schema.Type<typeof LayoutMode>;

export const PlankSizing = S.Record({ key: S.String, value: S.Number });
export type PlankSizing = S.Schema.Type<typeof PlankSizing>;

export const Deck = S.Struct({
  initialized: S.Boolean.annotations({
    description: "If false, the deck has not yet left solo mode and new planks should be solo'd.",
  }),
  active: S.mutable(S.Array(S.String)),
  // TODO(wittjosiah): Piping into both mutable and optional caused invalid typescript output.
  activeCompanions: S.optional(S.mutable(S.Record({ key: S.String, value: S.String }))),
  inactive: S.mutable(S.Array(S.String)),
  solo: S.optional(S.String),
  fullscreen: S.Boolean,
  plankSizing: S.mutable(PlankSizing),
  companionFrameSizing: S.mutable(PlankSizing),
});
export type Deck = S.Schema.Type<typeof Deck>;

export const defaultDeck = {
  initialized: false,
  active: [],
  activeCompanions: {},
  inactive: [],
  fullscreen: false,
  solo: undefined,
  plankSizing: {},
  companionFrameSizing: {},
} satisfies Deck;

export const surfaceVariantSeparator = '--';

export const surfaceVariant = (id: string) => `${surfaceVariantSeparator}${id}`;

export const DeckState = S.mutable(
  S.Struct({
    sidebarState: S.Literal('closed', 'collapsed', 'expanded'),
    complementarySidebarState: S.Literal('closed', 'collapsed', 'expanded'),
    complementarySidebarPanel: S.optional(S.String),

    dialogOpen: S.Boolean,
    /**
     * Data to be passed to the dialog Surface.
     */
    dialogContent: S.optional(S.Any),
    dialogBlockAlign: S.optional(S.Literal('start', 'center', 'end')),
    dialogType: S.optional(S.Literal('default', 'alert')),

    popoverOpen: S.Boolean,
    popoverSide: S.optional(S.Literal('top', 'right', 'bottom', 'left')),
    /**
     * Data to be passed to the popover Surface.
     */
    popoverContent: S.optional(S.Any),
    popoverAnchorId: S.optional(S.String),

    toasts: S.mutable(S.Array(LayoutAction.Toast)),
    currentUndoId: S.optional(S.String),

    activeDeck: S.String,
    previousDeck: S.String,
    decks: S.mutable(S.Record({ key: S.String, value: S.mutable(Deck) })),
    previousMode: S.mutable(S.Record({ key: S.String, value: LayoutMode })),
    deck: S.mutable(Deck),

    /**
     * The identifier of a component to scroll into view when it is mounted.
     */
    scrollIntoView: S.optional(S.String),
  }),
);

export type DeckState = S.Schema.Type<typeof DeckState>;

export const getMode = (deck: Deck): LayoutMode => {
  if (deck.solo) {
    return deck.fullscreen ? 'fullscreen' : 'solo';
  }

  return 'deck';
};

// NOTE: Chosen from RFC 1738’s `safe` characters: http://www.faqs.org/rfcs/rfc1738.html
export const SLUG_PATH_SEPARATOR = '~';

export const DECK_ACTION = `${DECK_PLUGIN}/action`;

export namespace DeckAction {
  const PartAdjustmentSchema = S.Union(
    S.Literal('close').annotations({ description: 'Close the plank.' }),
    S.Literal('solo').annotations({ description: 'Solo the plank.' }),
    S.Literal('increment-start').annotations({ description: 'Move the plank towards the start of the deck.' }),
    S.Literal('increment-end').annotations({ description: 'Move the plank towards the end of the deck.' }),
  );
  export type PartAdjustment = S.Schema.Type<typeof PartAdjustmentSchema>;
  export const Adjustment = S.mutable(S.Struct({ id: S.String, type: PartAdjustmentSchema }));
  export type Adjustment = S.Schema.Type<typeof Adjustment>;

  /**
   * An atomic transaction to apply to the deck, describing which element to move to which location.
   */
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
