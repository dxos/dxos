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

export type DeckSettingsProps = {
  showFooter: boolean;
  customSlots: boolean;
  enableNativeRedirect: boolean;
  deck: boolean;
};

export type DeckPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  SettingsProvides<DeckSettingsProps> &
  LayoutProvides &
  LocationProvides;
