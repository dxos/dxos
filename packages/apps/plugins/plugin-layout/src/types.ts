//
// Copyright 2023 DXOS.org
//

import {
  type LayoutProvides,
  type SettingsProvides,
  type IntentResolverProvides,
  type GraphBuilderProvides,
  type SurfaceProvides,
  type TranslationsProvides,
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
  LayoutProvides;
