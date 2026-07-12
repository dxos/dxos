//
// Copyright 2026 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { ProgressRegistry, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const ProgressPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'progress-registry',
    activatesOn: ActivationEvents.Startup,
    activate: () => ProgressRegistry(),
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(ReactSurface) ?? 'surfaces',
    activatesOn: ActivationEvents.SetupReactSurface,
    activate: () => ReactSurface(),
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default ProgressPlugin;
