//
// Copyright 2023 DXOS.org
//

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

export const DECK_ACTION = `${DECK_PLUGIN}/action`;

export namespace DeckAction {
  export class UpdatePlankSize extends S.TaggedClass<UpdatePlankSize>()(`${DECK_ACTION}/update-plank-size`, {
    input: S.Struct({
      id: S.String,
      size: S.Number,
    }),
    output: S.Void,
  }) {}
}
