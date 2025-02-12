//
// Copyright 2023 DXOS.org
//

import { LayoutAction } from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { type Label } from '@dxos/react-ui';

import { DECK_PLUGIN } from './meta';

// TODO(Zan): In the future we should consider adding new planks adjacent to the attended plank.
export const NewPlankPositions = ['start', 'end'] as const;
export type NewPlankPositioning = (typeof NewPlankPositions)[number];

export const OverscrollOptions = ['none', 'centering'] as const;
export type Overscroll = (typeof OverscrollOptions)[number];

// TODO(wittjosiah): Include a predicate for whether the panel is visible for the current subject.
export type Panel = { id: string; label: Label; icon: string };

export const DeckSettingsSchema = S.mutable(
  S.Struct({
    showHints: S.Boolean,
    customSlots: S.Boolean,
    flatDeck: S.Boolean,
    enableNativeRedirect: S.Boolean,
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

export const DeckState = S.mutable(
  S.Struct({
    modeHistory: S.mutable(S.Array(LayoutMode)),

    sidebarOpen: S.Boolean,
    complementarySidebarOpen: S.Boolean,
    complementarySidebarPanel: S.optional(S.String),

    dialogOpen: S.Boolean,
    /**
     * Data to be passed to the dialog Surface.
     */
    dialogContent: S.optional(S.Any),
    dialogBlockAlign: S.optional(S.Literal('start', 'center')),
    dialogType: S.optional(S.Literal('default', 'alert')),

    popoverOpen: S.Boolean,
    /**
     * Data to be passed to the popover Surface.
     */
    popoverContent: S.optional(S.Any),
    popoverAnchorId: S.optional(S.String),

    toasts: S.mutable(S.Array(LayoutAction.Toast)),
    currentUndoId: S.optional(S.String),

    fullscreen: S.Boolean,
    solo: S.optional(S.String),
    deck: S.mutable(S.Array(S.String)),
    closed: S.mutable(S.Array(S.String)),
    plankSizing: S.mutable(PlankSizing),

    /**
     * The identifier of a component to scroll into view when it is mounted.
     */
    scrollIntoView: S.optional(S.String),
  }),
);

export type DeckState = S.Schema.Type<typeof DeckState>;

export const getMode = (state: DeckState): LayoutMode => {
  if (state.solo) {
    return state.fullscreen ? 'fullscreen' : 'solo';
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
}
