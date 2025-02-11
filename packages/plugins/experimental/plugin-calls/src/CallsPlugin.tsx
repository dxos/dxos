//
// Copyright 2023 DXOS.org
//

import { Capabilities, contributes, defineModule, definePlugin, Events } from '@dxos/app-framework';

import { AppGraphBuilder, ReactSurface } from './capabilities';
import { meta } from './meta';
import translations from './translations';

export const CallsPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
      activate: ReactSurface,
    }),
  ]);
