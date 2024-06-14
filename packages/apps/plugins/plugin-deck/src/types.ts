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

export type DeckSettingsProps = {
  showFooter: boolean;
  customSlots: boolean;
  enableNativeRedirect: boolean;
  deck: boolean;
  newPlankPositioning: NewPlankPositioning;
};

export type DeckPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  SettingsProvides<DeckSettingsProps> &
  LayoutProvides &
  LocationProvides;
