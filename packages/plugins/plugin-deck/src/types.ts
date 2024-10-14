//
// Copyright 2023 DXOS.org
//

import type {
  GraphBuilderProvides,
  IntentResolverProvides,
  LayoutProvides,
  LocationProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';

// TODO(Zan): In the future we should consider adding new planks adjacent to the attended plank.
export const NewPlankPositions = ['start', 'end'] as const;
export type NewPlankPositioning = (typeof NewPlankPositions)[number];

export const OverscrollOptions = ['none', 'centering'] as const;
export type Overscroll = (typeof OverscrollOptions)[number];

export type DeckSettingsProps = {
  showHints: boolean;
  customSlots: boolean;
  flatDeck: boolean;
  enableNativeRedirect: boolean;
  disableDeck: boolean;
  newPlankPositioning: NewPlankPositioning;
  overscroll: Overscroll;
};

export type DeckPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  SettingsProvides<DeckSettingsProps> &
  LayoutProvides &
  LocationProvides;
