//
// Copyright 2023 DXOS.org
//

import { Common, Plugin } from '@dxos/app-framework';

import { AppGraphBuilder, HelpState, OperationResolver, ReactRoot, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { type Step } from './types';

export type HelpPluginOptions = { steps?: Step[] };

export const HelpPlugin = Plugin.define<HelpPluginOptions>(meta).pipe(
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activate: HelpState,
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Plugin.addModule(({ steps = [] }) => ({
    id: 'react-root',
    activatesOn: Common.ActivationEvent.Startup,
    activate: () => ReactRoot(steps),
  })),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.make,
);
