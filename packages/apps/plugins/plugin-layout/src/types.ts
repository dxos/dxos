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

export type LayoutSettingsProps = {
  enableComplementarySidebar: boolean;
  showFooter: boolean;
};

export type LayoutPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  GraphBuilderProvides &
  TranslationsProvides &
  SettingsProvides<LayoutSettingsProps> &
  LayoutProvides &
  LocationProvides;
