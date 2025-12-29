//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin } from '@dxos/app-framework';

import { AppGraphBuilder, PresenterSettings, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

// TODO(burdon): Only scale markdown content.
// TODO(burdon): Map stack content; Slide content type (e.g., markdown, sketch, IPFS image, table, etc.)

export const PresenterPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'settings',
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: PresenterSettings,
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.make,
);
