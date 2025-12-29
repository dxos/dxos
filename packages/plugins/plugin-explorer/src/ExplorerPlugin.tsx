//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { ExplorerAction, Graph } from './types';

export const ExplorerPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Graph.Graph),
      metadata: {
        icon: 'ph--graph--regular',
        iconHue: 'green',
        inputSchema: ExplorerAction.GraphProps,
        createObjectIntent: ((props, options) =>
          createIntent(ExplorerAction.CreateGraph, { ...props, space: options.db })) satisfies CreateObjectIntent,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Graph.Graph] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Plugin.make,
);
