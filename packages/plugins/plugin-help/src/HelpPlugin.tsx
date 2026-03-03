//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';

import { AppGraphBuilder, HelpState, OperationResolver, ReactRoot, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { type Step } from './types';

export type HelpPluginOptions = { steps?: Step[] };

export const HelpPlugin = Plugin.define<HelpPluginOptions>(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activate: HelpState,
  }),
  Plugin.addModule(({ steps = [] }) => ({
    id: 'react-root',
    activatesOn: ActivationEvents.Startup,
    activate: () => ReactRoot(steps),
  })),
  Plugin.make,
);
