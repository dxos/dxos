//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';
import { Project } from '@dxos/types';

import { AppGraphBuilder, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { ProjectAction } from './types';

export const ProjectPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Project.Project.typename,
      metadata: {
        icon: 'ph--check-square-offset--regular',
        iconHue: 'purple',
        createObjectIntent: ((_, options) =>
          createIntent(ProjectAction.Create, { db: options.db })) satisfies CreateObjectIntent,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Project.Project] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.make,
);
