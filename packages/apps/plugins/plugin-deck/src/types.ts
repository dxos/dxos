//
// Copyright 2023 DXOS.org
//

import type {
  LayoutProvides,
  SettingsProvides,
  IntentResolverProvides,
  GraphBuilderProvides,
  SurfaceProvides,
  TranslationsProvides,
  LocationProvides,
} from '@dxos/app-framework';

export type DeckSettingsProps = {
  showFooter: boolean;
  enableNativeRedirect: boolean;
};

export type DeckPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  SettingsProvides<DeckSettingsProps> &
  LayoutProvides &
  LocationProvides;
